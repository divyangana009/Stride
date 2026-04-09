import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import webpush from "web-push";

webpush.setVapidDetails("mailto:stride@example.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffset);
  const currentHour = String(ist.getUTCHours()).padStart(2, "0");
  const currentMin = ist.getUTCMinutes();

  // 5-min time window
  const timeWindow: string[] = [];
  for (let m = 0; m < 5; m++) {
    const mm = Math.floor(currentMin / 5) * 5 + m;
    if (mm < 60) timeWindow.push(`${currentHour}:${String(mm).padStart(2, "0")}`);
  }

  const currentDay = ist.getUTCDay();
  const today = ist.toISOString().split("T")[0];

  // Find ALL goals with nudge times (reminderTimes is JSON array)
  const goals = await prisma.goal.findMany({
    where: { isActive: true, reminderTimes: { not: null } },
    include: { user: { include: { pushSubscriptions: true } } },
  });

  let sent = 0, skipped = 0;

  for (const goal of goals) {
    // Parse reminder times array and check if any match current window
    const times: string[] = goal.reminderTimes ? JSON.parse(goal.reminderTimes) : [];
    const hasMatchingTime = times.some(t => timeWindow.includes(t));
    if (!hasMatchingTime) continue;

    // Check nudge schedule (daily/days/interval)
    const config = goal.nudgeConfig ? JSON.parse(goal.nudgeConfig) : { type: "daily" };
    let shouldNudge = false;
    if (config.type === "daily") shouldNudge = true;
    else if (config.type === "days" && Array.isArray(config.days)) shouldNudge = config.days.includes(currentDay);
    else if (config.type === "interval" && config.interval) {
      const diffDays = Math.floor((now.getTime() - new Date(goal.createdAt).getTime()) / 86400000);
      shouldNudge = diffDays % config.interval === 0;
    }
    if (!shouldNudge) { skipped++; continue; }

    // Skip if completed today
    const completion = await prisma.goalCompletion.findUnique({ where: { goalId_date: { goalId: goal.id, date: today } } });
    if (completion?.completed) { skipped++; continue; }

    // Build notification message
    const body = goal.nudgeMessage || `Time for: "${goal.title}"`;

    for (const sub of goal.user.pushSubscriptions) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: `Stride: ${goal.title}`, body, tag: `nudge-${goal.id}`, url: "/dashboard" })
        );
        sent++;
      } catch (err: unknown) {
        const sc = (err as { statusCode?: number }).statusCode;
        if (sc === 404 || sc === 410) await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ sent, skipped, timeWindow, goalsChecked: goals.length, date: today });
}
