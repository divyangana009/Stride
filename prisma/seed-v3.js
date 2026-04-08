const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

function srand(seed) { let x = Math.sin(seed) * 10000; return x - Math.floor(x); }

async function seed() {
  const user = await p.user.findFirst();
  if (!user) { console.log("Register first"); process.exit(1); }
  console.log("Seeding for:", user.email);

  // Create sections (no frequency on sections anymore!)
  const fitness = await p.goalSection.create({ data: { name: "Fitness", order: 0, userId: user.id } });
  const morning = await p.goalSection.create({ data: { name: "Morning Routine", order: 1, userId: user.id } });
  const wellness = await p.goalSection.create({ data: { name: "Health & Wellness", order: 2, userId: user.id } });
  const growth = await p.goalSection.create({ data: { name: "Personal Growth", order: 3, userId: user.id } });
  const social = await p.goalSection.create({ data: { name: "Social", order: 4, userId: user.id } });

  // Goals with MIXED frequencies per section
  const allGoals = [];
  const goalDefs = [
    // Fitness: mix of daily + weekly + monthly
    { s: fitness, title: "Exercise 30 min", freq: "daily", reminder: "06:30", nc: { type: "daily" } },
    { s: fitness, title: "10k steps", freq: "daily", reminder: "18:00", nc: { type: "daily" } },
    { s: fitness, title: "Yoga session", freq: "weekly", reminder: "07:00", nc: { type: "days", days: [0, 3, 6] } },
    { s: fitness, title: "Run 5K", freq: "monthly", reminder: "07:00", nc: { type: "interval", interval: 15 } },

    // Morning: all daily
    { s: morning, title: "Wake up before 6am", freq: "daily", reminder: "05:45", nc: { type: "daily" } },
    { s: morning, title: "Meditate 10 min", freq: "daily", reminder: "06:15", nc: { type: "daily" } },
    { s: morning, title: "Drink water", freq: "daily", reminder: "06:00", nc: { type: "daily" } },
    { s: morning, title: "Read 8-10 pages", freq: "daily", reminder: "07:00", nc: { type: "daily" } },

    // Wellness: daily + weekly
    { s: wellness, title: "No junk/sugar", freq: "daily", reminder: "12:00", nc: { type: "daily" } },
    { s: wellness, title: "Drink 2.5-3L water", freq: "daily", reminder: "10:00", nc: { type: "daily" } },
    { s: wellness, title: "Sleep before 11pm", freq: "daily", reminder: "22:30", nc: { type: "daily" } },
    { s: wellness, title: "Herbal drink", freq: "daily", reminder: "16:00", nc: { type: "daily" } },
    { s: wellness, title: "Weigh-in", freq: "weekly", reminder: "07:00", nc: { type: "days", days: [1] } },

    // Growth: daily + weekly + monthly
    { s: growth, title: "Read newspaper", freq: "daily", reminder: "08:00", nc: { type: "daily" } },
    { s: growth, title: "Journal 10 min", freq: "daily", reminder: "21:00", nc: { type: "daily" } },
    { s: growth, title: "Learn something new", freq: "weekly", reminder: "19:00", nc: { type: "days", days: [3, 6] } },
    { s: growth, title: "Complete mini-project", freq: "monthly", reminder: "10:00", nc: { type: "interval", interval: 10 } },
    { s: growth, title: "Read a full book", freq: "monthly", reminder: "20:00", nc: { type: "interval", interval: 15 } },

    // Social: daily + weekly
    { s: social, title: "Phone a friend", freq: "weekly", reminder: "18:00", nc: { type: "days", days: [2, 5] } },
    { s: social, title: "Practice gratitude", freq: "daily", reminder: "21:30", nc: { type: "daily" } },
    { s: social, title: "Call family", freq: "weekly", reminder: "11:00", nc: { type: "days", days: [0] } },
  ];

  for (let i = 0; i < goalDefs.length; i++) {
    const d = goalDefs[i];
    const g = await p.goal.create({
      data: { title: d.title, frequency: d.freq, reminderTime: d.reminder, nudgeConfig: JSON.stringify(d.nc), order: i, userId: user.id, sectionId: d.s.id },
    });
    allGoals.push({ goal: g, ...d });
  }
  console.log(`Created 5 sections, ${allGoals.length} goals`);

  // Dates: Mar 15 -> Apr 7
  const dates = [];
  for (let m = 15; m <= 31; m++) dates.push(`2026-03-${String(m).padStart(2, "0")}`);
  for (let d = 1; d <= 7; d++) dates.push(`2026-04-${String(d).padStart(2, "0")}`);
  console.log(`${dates.length} days: ${dates[0]} to ${dates[dates.length - 1]}`);

  const basePr = [
    0.50, 0.45, 0.40, 0.15,  // fitness
    0.40, 0.35, 0.70, 0.35,  // morning
    0.55, 0.50, 0.45, 0.40, 0.50,  // wellness
    0.35, 0.50, 0.40, 0.10, 0.15,  // growth
    0.45, 0.50, 0.40,  // social
  ];

  for (let di = 0; di < dates.length; di++) {
    const date = dates[di];
    const progress = di / dates.length;
    const dow = new Date(date).getDay();
    const log = await p.dailyLog.create({ data: { date, userId: user.id } });
    let total = 0, done = 0;

    for (let gi = 0; gi < allGoals.length; gi++) {
      const { goal, freq } = allGoals[gi];
      let pr = basePr[gi] + progress * 0.30;

      if (freq === "daily") {
        if (dow === 0 || dow === 6) pr -= 0.10; // weekends harder
      } else if (freq === "weekly") {
        if (dow === 0) pr += 0.25;
        else if (dow === 6) pr += 0.10;
        else pr -= 0.20;
      } else {
        pr *= 0.25;
        if (parseInt(date.split("-")[2]) >= 25) pr += 0.20;
      }

      pr = Math.max(0.05, Math.min(0.95, pr));
      const completed = srand(di * 100 + gi * 17 + 7) < pr;
      await p.goalCompletion.create({ data: { goalId: goal.id, date, completed, dailyLogId: log.id } });
      total++; if (completed) done++;

      // Update streaks
      if (completed && di > 0) {
        const prevDate = dates[di - 1];
        const prev = await p.goalCompletion.findUnique({ where: { goalId_date: { goalId: goal.id, date: prevDate } } });
        const streak = prev?.completed ? goal.currentStreak + 1 : 1;
        await p.goal.update({ where: { id: goal.id }, data: { currentStreak: streak, bestStreak: Math.max(goal.bestStreak || 0, streak) } });
        goal.currentStreak = streak;
        goal.bestStreak = Math.max(goal.bestStreak || 0, streak);
      } else if (completed) {
        await p.goal.update({ where: { id: goal.id }, data: { currentStreak: 1, bestStreak: 1 } });
        goal.currentStreak = 1; goal.bestStreak = 1;
      } else {
        await p.goal.update({ where: { id: goal.id }, data: { currentStreak: 0 } });
        goal.currentStreak = 0;
      }
    }

    const score = Math.round((done / total) * 100);
    await p.dailyLog.update({ where: { id: log.id }, data: { score } });
    console.log(`  ${date} ${"█".repeat(Math.round(score/5))}${"░".repeat(20-Math.round(score/5))} ${score}%`);
  }

  // Journals
  const journals = [
    { date: "2026-03-15", prompt: "What are you grateful for today?", response: "Grateful for starting this habit tracking journey. Small steps!" },
    { date: "2026-03-18", prompt: "What challenged you today?", response: "Waking up early was tough. But meditation helped center me." },
    { date: "2026-03-21", prompt: "What did you learn today?", response: "Consistency > intensity. Even 5 min of exercise counts." },
    { date: "2026-03-24", prompt: "Describe a memorable moment.", response: "Amazing sunset during evening walk. Stopped and breathed." },
    { date: "2026-03-26", prompt: "Who made a positive impact?", response: "Met old friend Nikki. Great laughs, felt so good to reconnect." },
    { date: "2026-03-29", prompt: "How are you feeling?", response: "Proud of my progress! The charts are trending up!" },
    { date: "2026-04-01", prompt: "Top 3 priorities this month?", response: "1. Hit 80%+ consistently\n2. Finish my book\n3. Run 5K" },
    { date: "2026-04-03", prompt: "What challenged you?", response: "Sugar cravings at a party. Stayed strong!" },
    { date: "2026-04-05", prompt: "What are you grateful for?", response: "This app keeping me accountable. Seeing visual progress is motivating." },
    { date: "2026-04-07", prompt: "What did you learn?", response: "Mixing daily + weekly + monthly goals in same section keeps things flexible." },
  ];
  for (const j of journals) await p.journalEntry.create({ data: { ...j, userId: user.id } });
  console.log(`\nAdded ${journals.length} journals. Done!`);
}

seed().catch(console.error).finally(() => p.$disconnect());
