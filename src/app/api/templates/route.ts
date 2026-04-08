import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const templates = await prisma.template.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(templates.map(t => ({ ...t, goals: JSON.parse(t.goals) })));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, description, goals, frequency } = await req.json();
  if (!name || !goals?.length) return NextResponse.json({ error: "Name and goals required" }, { status: 400 });
  const template = await prisma.template.create({ data: { name, description, goals: JSON.stringify(goals), frequency: frequency || "daily", userId: session.user.id } });
  return NextResponse.json({ ...template, goals: JSON.parse(template.goals) }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, name, description, goals, frequency } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (description !== undefined) data.description = description;
  if (goals !== undefined) data.goals = JSON.stringify(goals);
  if (frequency !== undefined) data.frequency = frequency;
  const t = await prisma.template.update({ where: { id, userId: session.user.id }, data });
  return NextResponse.json({ ...t, goals: JSON.parse(t.goals) });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { templateId, mode, targetSectionId } = await req.json();
  const template = await prisma.template.findFirst({ where: { id: templateId, userId: session.user.id } });
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const goalTitles: string[] = JSON.parse(template.goals);
  const freq = template.frequency || "daily";

  if (mode === "merge" && targetSectionId) {
    const existing = await prisma.goal.findMany({ where: { sectionId: targetSectionId, userId: session.user.id, isActive: true } });
    const titles = new Set(existing.map(g => g.title));
    const newG = goalTitles.filter(t => !titles.has(t));
    let order = existing.length;
    for (const title of newG) await prisma.goal.create({ data: { title, frequency: freq, order: order++, userId: session.user.id, sectionId: targetSectionId } });
    return NextResponse.json({ message: `Merged ${newG.length} goals` });
  } else {
    const sc = await prisma.goalSection.count({ where: { userId: session.user.id, isActive: true } });
    const section = await prisma.goalSection.create({ data: { name: template.name, order: sc, userId: session.user.id } });
    for (let i = 0; i < goalTitles.length; i++) await prisma.goal.create({ data: { title: goalTitles[i], frequency: freq, order: i, userId: session.user.id, sectionId: section.id } });
    return NextResponse.json({ message: `Created "${section.name}" with ${goalTitles.length} goals` });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await prisma.template.delete({ where: { id, userId: session.user.id } });
  return NextResponse.json({ message: "Deleted" });
}
