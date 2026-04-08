import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sections = await prisma.goalSection.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { order: "asc" },
    include: { _count: { select: { goals: { where: { isActive: true } } } } },
  });
  return NextResponse.json(sections);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const count = await prisma.goalSection.count({ where: { userId: session.user.id, isActive: true } });
  try {
    const section = await prisma.goalSection.create({ data: { name, order: count, userId: session.user.id } });
    return NextResponse.json(section, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create section" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, name } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  const section = await prisma.goalSection.update({ where: { id, userId: session.user.id }, data: { name } });
  return NextResponse.json(section);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  await prisma.goalSection.update({ where: { id, userId: session.user.id }, data: { isActive: false } });
  await prisma.goal.updateMany({ where: { sectionId: id, userId: session.user.id }, data: { isActive: false } });
  return NextResponse.json({ message: "Deleted" });
}
