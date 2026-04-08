import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    if (await prisma.user.findUnique({ where: { email } })) return NextResponse.json({ error: "User already exists" }, { status: 400 });

    const user = await prisma.user.create({ data: { name, email, hashedPassword: await bcrypt.hash(password, 12) } });

    await prisma.template.createMany({ data: [
      { name: "Morning Routine", description: "Start your day right", goals: JSON.stringify(["Wake up before 6am", "Meditate 10 min", "Exercise 30 min", "Drink water", "Read 10 pages"]), frequency: "daily", isBuiltIn: true, userId: user.id },
      { name: "Health & Wellness", description: "Physical and mental health", goals: JSON.stringify(["No junk/sugar", "Drink 2.5-3L water", "Herbal drink", "Sleep before 11pm"]), frequency: "daily", isBuiltIn: true, userId: user.id },
      { name: "Weekly Review", description: "Reflect and plan", goals: JSON.stringify(["Review goals", "Plan next week", "Call family", "Clean workspace"]), frequency: "weekly", isBuiltIn: true, userId: user.id },
      { name: "Monthly Growth", description: "Big-picture goals", goals: JSON.stringify(["Read a book", "Mini-project", "Try new skill"]), frequency: "monthly", isBuiltIn: true, userId: user.id },
    ] });

    return NextResponse.json({ message: "User created" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
