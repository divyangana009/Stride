import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") || String(now.getFullYear()));
  const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1));
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

  const dailyLogs = await prisma.dailyLog.findMany({ where: { userId: session.user.id, date: { gte: startDate, lte: endDate } }, orderBy: { date: "asc" } });
  const totalDays = dailyLogs.length;
  const avgScore = totalDays > 0 ? Math.round(dailyLogs.reduce((s, l) => s + (l.score ?? 0), 0) / totalDays) : 0;
  const perfectDays = dailyLogs.filter(l => l.score === 100).length;
  const daysInMonth = new Date(year, month, 0).getDate();

  // All goals with completions
  const goals = await prisma.goal.findMany({
    where: { userId: session.user.id, isActive: true },
    include: { section: true, completions: { where: { date: { gte: startDate, lte: endDate }, completed: true } } },
  });

  function expectedPeriods(f: string) {
    if (f === "daily") return totalDays || 1;
    if (f === "weekly") return Math.ceil(daysInMonth / 7);
    return 1;
  }

  // Section stats
  const sections = await prisma.goalSection.findMany({ where: { userId: session.user.id, isActive: true }, orderBy: { order: "asc" } });
  const sectionStats = sections.map(s => {
    const sg = goals.filter(g => g.sectionId === s.id);
    const totalComp = sg.reduce((sum, g) => sum + g.completions.length, 0);
    const maxPossible = sg.reduce((sum, g) => sum + expectedPeriods(g.frequency), 0);
    return { id: s.id, name: s.name, score: Math.min(100, maxPossible > 0 ? Math.round((totalComp / maxPossible) * 100) : 0),
      goalStats: sg.map(g => { const ep = expectedPeriods(g.frequency); return { id: g.id, title: g.title, frequency: g.frequency, completedPeriods: g.completions.length, expectedPeriods: ep, percentage: Math.min(100, ep > 0 ? Math.round((g.completions.length / ep) * 100) : 0) }; }) };
  });

  // Frequency stats
  const freqStats: Record<string, { score: number; goals: number; avgCompletion: number }> = {};
  for (const f of ["daily", "weekly", "monthly"]) {
    const fg = goals.filter(g => g.frequency === f);
    const ep = expectedPeriods(f);
    const totalComp = fg.reduce((s, g) => s + g.completions.length, 0);
    const maxP = fg.length * ep;
    freqStats[f] = { score: Math.min(100, maxP > 0 ? Math.round((totalComp / maxP) * 100) : 0), goals: fg.length, avgCompletion: fg.length > 0 ? Math.round(totalComp / fg.length) : 0 };
  }

  // Top & needs work
  const allGoalStats = goals.map(g => { const ep = expectedPeriods(g.frequency); return { id: g.id, title: g.title, frequency: g.frequency, section: g.section?.name || "Other", percentage: Math.min(100, ep > 0 ? Math.round((g.completions.length / ep) * 100) : 0), streak: g.currentStreak, bestStreak: g.bestStreak }; });
  const top = [...allGoalStats].sort((a, b) => b.percentage - a.percentage).slice(0, 3);
  const weak = [...allGoalStats].sort((a, b) => a.percentage - b.percentage).slice(0, 3);

  // Streaks
  const streakGoals = goals.filter(g => g.currentStreak > 0).sort((a, b) => b.currentStreak - a.currentStreak).slice(0, 5).map(g => ({ title: g.title, currentStreak: g.currentStreak, bestStreak: g.bestStreak }));

  return NextResponse.json({
    dailyScores: dailyLogs.map(l => ({ date: l.date, score: l.score ?? 0 })),
    summary: { totalDays, avgScore, perfectDays, daysInMonth },
    sectionStats, freqStats, top, weak, streakGoals,
  });
}
