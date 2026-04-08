import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function parseGoal(g: any) {
  return { ...g, nudgeConfig: g.nudgeConfig ? JSON.parse(g.nudgeConfig) : null };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sections = await prisma.goalSection.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { order: "asc" },
    include: { goals: { where: { isActive: true }, orderBy: { order: "asc" } } },
  });

  const unsectioned = await prisma.goal.findMany({
    where: { userId: session.user.id, isActive: true, sectionId: null },
    orderBy: { order: "asc" },
  });

  return NextResponse.json({
    sections: sections.map(s => ({ ...s, goals: s.goals.map(parseGoal) })),
    unsectioned: unsectioned.map(parseGoal),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { title, description, frequency, reminderTime, nudgeConfig, sectionId } = await req.json();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const count = await prisma.goal.count({ where: { userId: session.user.id, isActive: true, sectionId: sectionId || null } });
  try {
    const goal = await prisma.goal.create({
      data: { title, description, frequency: frequency || "daily", reminderTime, nudgeConfig: nudgeConfig ? JSON.stringify(nudgeConfig) : null, order: count, userId: session.user.id, sectionId: sectionId || null },
    });
    return NextResponse.json(parseGoal(goal), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await prisma.goal.update({ where: { id, userId: session.user.id }, data: { isActive: false } });
  return NextResponse.json({ message: "Removed" });
}
