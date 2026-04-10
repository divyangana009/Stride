import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function parseGoal(g: any) {
  let reminderTimes: string[] = [];
  if (g.reminderTimes) {
    try {
      const parsed = JSON.parse(g.reminderTimes);
      reminderTimes = Array.isArray(parsed) ? parsed : [g.reminderTimes];
    } catch {
      // Old format: single time string like "22:55"
      reminderTimes = [g.reminderTimes];
    }
  }
  return {
    ...g,
    reminderTimes,
    nudgeConfig: g.nudgeConfig ? (() => { try { return JSON.parse(g.nudgeConfig); } catch { return null; } })() : null,
  };
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
  const { title, description, frequency, reminderTimes, nudgeConfig, nudgeMessage, sectionId } = await req.json();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const count = await prisma.goal.count({ where: { userId: session.user.id, isActive: true, sectionId: sectionId || null } });
  try {
    const goal = await prisma.goal.create({
      data: {
        title, description, frequency: frequency || "daily",
        reminderTimes: reminderTimes?.length ? JSON.stringify(reminderTimes) : null,
        nudgeConfig: nudgeConfig ? JSON.stringify(nudgeConfig) : null,
        nudgeMessage: nudgeMessage || null,
        order: count, userId: session.user.id, sectionId: sectionId || null,
      },
    });
    return NextResponse.json(parseGoal(goal), { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, title, description, frequency, reminderTimes, nudgeConfig, nudgeMessage } = await req.json();
  if (!id) return NextResponse.json({ error: "Goal ID required" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (frequency !== undefined) data.frequency = frequency;
  if (reminderTimes !== undefined) data.reminderTimes = reminderTimes?.length ? JSON.stringify(reminderTimes) : null;
  if (nudgeConfig !== undefined) data.nudgeConfig = nudgeConfig ? JSON.stringify(nudgeConfig) : null;
  if (nudgeMessage !== undefined) data.nudgeMessage = nudgeMessage || null;

  const goal = await prisma.goal.update({ where: { id, userId: session.user.id }, data });
  return NextResponse.json(parseGoal(goal));
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await prisma.goal.update({ where: { id, userId: session.user.id }, data: { isActive: false } });
  return NextResponse.json({ message: "Removed" });
}
