import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const DEFAULT_PROMPTS = [
  "What are you grateful for today?",
  "How are you feeling right now?",
  "What's one thing you accomplished today?",
  "What challenged you today and how did you handle it?",
  "What's one thing you'd like to improve tomorrow?",
  "Describe a memorable moment from today.",
  "Who made a positive impact on your day?",
  "What did you learn today?",
  "What are your top 3 priorities for tomorrow?",
  "Write about something that made you smile today.",
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  const where: Record<string, unknown> = { userId: session.user.id };
  if (date) where.date = date;

  const entries = await prisma.journalEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // Pick a random prompt for today
  const todayPrompt = DEFAULT_PROMPTS[Math.floor(Math.random() * DEFAULT_PROMPTS.length)];

  return NextResponse.json({ entries, todayPrompt, prompts: DEFAULT_PROMPTS });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prompt, response, date } = await req.json();

  if (!prompt || !response) {
    return NextResponse.json(
      { error: "Prompt and response are required" },
      { status: 400 }
    );
  }

  const entryDate = date || new Date().toISOString().split("T")[0];

  const entry = await prisma.journalEntry.create({
    data: {
      prompt,
      response,
      date: entryDate,
      userId: session.user.id,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
