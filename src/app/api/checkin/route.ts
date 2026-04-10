import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const date = new URL(req.url).searchParams.get("date") || new Date().toISOString().split("T")[0];

  const sections = await prisma.goalSection.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { order: "asc" },
    include: { goals: { where: { isActive: true }, orderBy: { order: "asc" }, include: { completions: { where: { date } } } } },
  });

  const unsectioned = await prisma.goal.findMany({
    where: { userId: session.user.id, isActive: true, sectionId: null },
    orderBy: { order: "asc" },
    include: { completions: { where: { date } } },
  });

  function mapGoal(g: any) {
    let rt: string[] = [];
    if (g.reminderTimes) { try { const p = JSON.parse(g.reminderTimes); rt = Array.isArray(p) ? p : [g.reminderTimes]; } catch { rt = [g.reminderTimes]; } }
    return { id: g.id, title: g.title, frequency: g.frequency, completed: g.completions?.[0]?.completed ?? false, currentStreak: g.currentStreak, reminderTimes: rt };
  }
  function calcScore(goals: any[]) {
    const t = goals.length, c = goals.filter(g => g.completions?.[0]?.completed).length;
    return { score: t > 0 ? Math.round((c / t) * 100) : 0, completed: c, total: t };
  }

  const sectionData = sections.map(s => { const sc = calcScore(s.goals); return { id: s.id, name: s.name, goals: s.goals.map(mapGoal), ...sc }; });
  const unsc = calcScore(unsectioned);
  const allGoals = [...sections.flatMap(s => s.goals), ...unsectioned];
  const overall = calcScore(allGoals);

  const freqScores: Record<string, { score: number; completed: number; total: number }> = {};
  for (const f of ["daily", "weekly", "monthly"]) {
    const fg = allGoals.filter(g => g.frequency === f);
    freqScores[f] = calcScore(fg);
  }

  return NextResponse.json({ sections: sectionData, unsectioned: unsectioned.map(mapGoal), unsectionedScore: unsc, consolidatedScore: overall.score, completedCount: overall.completed, totalCount: overall.total, freqScores, date });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { goalId, date, completed } = await req.json();
  if (!goalId || !date) return NextResponse.json({ error: "goalId and date required" }, { status: 400 });

  const dailyLog = await prisma.dailyLog.upsert({ where: { userId_date: { userId: session.user.id, date } }, create: { userId: session.user.id, date }, update: {} });
  await prisma.goalCompletion.upsert({ where: { goalId_date: { goalId, date } }, create: { goalId, date, completed: completed ?? true, dailyLogId: dailyLog.id }, update: { completed: completed ?? true } });

  // Update streak
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (goal && completed) {
    const yesterday = new Date(date); yesterday.setDate(yesterday.getDate() - 1);
    const prev = await prisma.goalCompletion.findUnique({ where: { goalId_date: { goalId, date: yesterday.toISOString().split("T")[0] } } });
    const ns = prev?.completed ? goal.currentStreak + 1 : 1;
    await prisma.goal.update({ where: { id: goalId }, data: { currentStreak: ns, bestStreak: Math.max(goal.bestStreak, ns) } });
  } else if (goal) {
    await prisma.goal.update({ where: { id: goalId }, data: { currentStreak: 0 } });
  }

  // Recalculate score
  const allGoals = await prisma.goal.findMany({ where: { userId: session.user.id, isActive: true }, include: { completions: { where: { date, completed: true } } } });
  const totalG = allGoals.length, doneG = allGoals.filter(g => g.completions.length > 0).length;
  const score = totalG > 0 ? Math.round((doneG / totalG) * 100) : 0;
  await prisma.dailyLog.update({ where: { id: dailyLog.id }, data: { score } });

  const sections = await prisma.goalSection.findMany({ where: { userId: session.user.id, isActive: true }, include: { goals: { where: { isActive: true }, include: { completions: { where: { date, completed: true } } } } } });
  const sectionScores = sections.map(s => { const t = s.goals.length, c = s.goals.filter(g => g.completions.length > 0).length; return { id: s.id, score: t > 0 ? Math.round((c / t) * 100) : 0, completed: c, total: t }; });
  const freqScores: Record<string, { score: number; completed: number; total: number }> = {};
  for (const f of ["daily", "weekly", "monthly"]) {
    const fg = allGoals.filter(g => g.frequency === f), fc = fg.filter(g => g.completions.length > 0).length;
    freqScores[f] = { score: fg.length > 0 ? Math.round((fc / fg.length) * 100) : 0, completed: fc, total: fg.length };
  }

  return NextResponse.json({ consolidatedScore: score, completedCount: doneG, totalCount: totalG, sectionScores, freqScores });
}
