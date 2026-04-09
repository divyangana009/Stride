import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:stride@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// Called every 5 min by cron-job.org — sends nudges for goals matching current time window
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentHour = String(now.getUTCHours()).padStart(2, "0");
  const currentMin = now.getUTCMinutes();
  // Match times within a 5-min window (e.g., 08:00-08:04 all match 08:00)
  const roundedMin = String(Math.floor(currentMin / 5) * 5).padStart(2, "0");
  const timeWindow = [`${currentHour}:${roundedMin}`];
  // Also check the exact minute slots in this 5-min window
  for (let m = 0; m < 5; m++) {
    const mm = String(Math.floor(currentMin / 5) * 5 + m).padStart(2, "0");
    if (!timeWindow.includes(`${currentHour}:${mm}`)) timeWindow.push(`${currentHour}:${mm}`);
  }

  const currentDay = now.getDay();
  const today = now.toISOString().split("T")[0];

  const goals = await prisma.goal.findMany({
    where: { isActive: true, reminderTime: { in: timeWindow } },
    include: { user: { include: { pushSubscriptions: true } } },
  });

  let sent = 0;
  let skipped = 0;

  for (const goal of goals) {
    const config = goal.nudgeConfig ? JSON.parse(goal.nudgeConfig) : { type: "daily" };
    let shouldNudge = false;

    if (config.type === "daily") shouldNudge = true;
    else if (config.type === "days" && Array.isArray(config.days)) shouldNudge = config.days.includes(currentDay);
    else if (config.type === "interval" && config.interval) {
      const diffDays = Math.floor((now.getTime() - new Date(goal.createdAt).getTime()) / 86400000);
      shouldNudge = diffDays % config.interval === 0;
    }

    if (!shouldNudge) { skipped++; continue; }

    // Skip if already completed today
    const completion = await prisma.goalCompletion.findUnique({
      where: { goalId_date: { goalId: goal.id, date: today } },
    });
    if (completion?.completed) { skipped++; continue; }

    // Send push notification
    for (const sub of goal.user.pushSubscriptions) {
      const payload = JSON.stringify({
        title: "Stride Nudge",
        body: `Time for: "${goal.title}"`,
        tag: `nudge-${goal.id}`,
        url: "/dashboard",
      });

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const sc = (err as { statusCode?: number }).statusCode;
        if (sc === 404 || sc === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json({ sent, skipped, timeWindow, goalsMatched: goals.length, date: today });
}
