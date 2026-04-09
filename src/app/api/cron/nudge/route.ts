import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:stride@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel sends this automatically)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const currentDay = now.getDay(); // 0=Sun
  const dayOfMonth = now.getDate();
  const today = now.toISOString().split("T")[0];

  // Find goals with nudges matching current time
  const goals = await prisma.goal.findMany({
    where: { isActive: true, reminderTime: currentTime },
    include: { user: { include: { pushSubscriptions: true } } },
  });

  let sent = 0;
  let skipped = 0;

  for (const goal of goals) {
    // Check if nudge should fire today based on nudgeConfig
    const config = goal.nudgeConfig ? JSON.parse(goal.nudgeConfig) : { type: "daily" };

    let shouldNudge = false;
    if (config.type === "daily") {
      shouldNudge = true;
    } else if (config.type === "days" && Array.isArray(config.days)) {
      shouldNudge = config.days.includes(currentDay);
    } else if (config.type === "interval" && config.interval) {
      // Check if today is an interval day (based on days since goal creation)
      const created = new Date(goal.createdAt);
      const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      shouldNudge = diffDays % config.interval === 0;
    }

    if (!shouldNudge) { skipped++; continue; }

    // Check if already completed today
    const completion = await prisma.goalCompletion.findUnique({
      where: { goalId_date: { goalId: goal.id, date: today } },
    });
    if (completion?.completed) { skipped++; continue; }

    // Send push to all user subscriptions
    for (const sub of goal.user.pushSubscriptions) {
      const payload = JSON.stringify({
        title: "Stride Nudge",
        body: `Have you done "${goal.title}" today?`,
        tag: `nudge-${goal.id}`,
        url: "/dashboard",
      });

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: any) {
        // Remove invalid subscriptions
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    }
  }

  return NextResponse.json({ sent, skipped, time: currentTime, goalsChecked: goals.length });
}
