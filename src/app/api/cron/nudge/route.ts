import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:stride@example.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const currentDay = now.getDay();
  const today = now.toISOString().split("T")[0];

  const goals = await prisma.goal.findMany({
    where: { isActive: true, reminderTime: { not: null } },
    include: { user: { include: { pushSubscriptions: true } } },
  });

  const userGoals = new Map<string, { goals: string[]; subs: typeof goals[0]["user"]["pushSubscriptions"] }>();

  for (const goal of goals) {
    const config = goal.nudgeConfig ? JSON.parse(goal.nudgeConfig) : { type: "daily" };
    let shouldNudge = false;
    if (config.type === "daily") shouldNudge = true;
    else if (config.type === "days" && Array.isArray(config.days)) shouldNudge = config.days.includes(currentDay);
    else if (config.type === "interval" && config.interval) {
      const diffDays = Math.floor((now.getTime() - new Date(goal.createdAt).getTime()) / 86400000);
      shouldNudge = diffDays % config.interval === 0;
    }
    if (!shouldNudge) continue;

    const completion = await prisma.goalCompletion.findUnique({ where: { goalId_date: { goalId: goal.id, date: today } } });
    if (completion?.completed) continue;

    const existing = userGoals.get(goal.userId);
    if (existing) existing.goals.push(goal.title);
    else userGoals.set(goal.userId, { goals: [goal.title], subs: goal.user.pushSubscriptions });
  }

  let sent = 0;
  for (const [, { goals: titles, subs }] of userGoals) {
    const count = titles.length;
    const preview = titles.slice(0, 3).join(", ");
    const body = count <= 3 ? preview : `${preview} +${count - 3} more`;
    const payload = JSON.stringify({ title: `Stride: ${count} goals for today`, body, tag: "stride-daily", url: "/dashboard" });

    for (const sub of subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        sent++;
      } catch (err: unknown) {
        const sc = (err as { statusCode?: number }).statusCode;
        if (sc === 404 || sc === 410) await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ sent, usersNotified: userGoals.size, date: today });
}
