import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dailyLogs = await prisma.dailyLog.findMany({ where: { userId: session.user.id }, orderBy: { date: "desc" }, take: 60 });
  const sections = await prisma.goalSection.findMany({ where: { userId: session.user.id, isActive: true }, orderBy: { order: "asc" } });

  const logs = [];
  for (const log of dailyLogs) {
    const sectionData = [];
    for (const section of sections) {
      const goals = await prisma.goal.findMany({
        where: { sectionId: section.id, userId: session.user.id, isActive: true },
        orderBy: { order: "asc" },
        include: { completions: { where: { date: log.date } } },
      });
      if (goals.length > 0) {
        const c = goals.filter(g => g.completions.some(x => x.completed)).length;
        sectionData.push({ name: section.name, completed: c, total: goals.length, score: Math.round((c / goals.length) * 100),
          goals: goals.map(g => ({ title: g.title, frequency: g.frequency, completed: g.completions.some(x => x.completed) })) });
      }
    }
    const unsectioned = await prisma.goal.findMany({ where: { userId: session.user.id, isActive: true, sectionId: null }, orderBy: { order: "asc" }, include: { completions: { where: { date: log.date } } } });
    if (unsectioned.length > 0) {
      const c = unsectioned.filter(g => g.completions.some(x => x.completed)).length;
      sectionData.push({ name: "Other", completed: c, total: unsectioned.length, score: Math.round((c / unsectioned.length) * 100), goals: unsectioned.map(g => ({ title: g.title, frequency: g.frequency, completed: g.completions.some(x => x.completed) })) });
    }
    logs.push({ date: log.date, score: log.score ?? 0, sections: sectionData, totalCompleted: sectionData.reduce((s, x) => s + x.completed, 0), totalGoals: sectionData.reduce((s, x) => s + x.total, 0) });
  }
  return NextResponse.json({ logs });
}
