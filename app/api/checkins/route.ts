import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTodayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// GET /api/checkins - Get recent check-ins
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在", code: "USER_NOT_FOUND" }, { status: 401 });
    }

    const today = getTodayDate();

    // Get today's check-in
    const todayCheckIn = await prisma.checkIn.findUnique({
      where: { userId_date: { userId: session.user.id, date: today } },
    });

    // Get recent 7 days check-ins for pattern analysis
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentCheckIns = await prisma.checkIn.findMany({
      where: { userId: session.user.id, date: { gte: sevenDaysAgo } },
      orderBy: { date: "desc" },
    });

    // Pattern analysis - parse JSON strings first
    const parsedCheckIns = recentCheckIns.map((c) => ({
      completedItems: safeParseJSON(c.completedItems as string | null),
      blockers: safeParseJSON(c.blockers as string | null),
    }));
    const patternAnalysis = analyzePatterns(parsedCheckIns);

    return NextResponse.json({
      today: todayCheckIn,
      recent: recentCheckIns.map((c) => ({
        date: c.date.toISOString(),
        currentFocus: c.currentFocus,
        completedItems: safeParseJSON(c.completedItems),
        blockers: safeParseJSON(c.blockers),
        patternNote: c.patternNote,
      })),
      patterns: patternAnalysis,
    });
  } catch (e) {
    console.error("CheckIn GET error:", e);
    return NextResponse.json({ error: "获取签到失败" }, { status: 500 });
  }
}

// POST /api/checkins - Create or update today's check-in
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在", code: "USER_NOT_FOUND" }, { status: 401 });
    }

    const body = await req.json();
    const { currentFocus, destination, todayPlan, completedItems, blockers } = body;
    const today = getTodayDate();

    const data: Record<string, unknown> = {};
    if (currentFocus !== undefined) data.currentFocus = currentFocus;
    if (destination !== undefined) data.destination = destination;
    if (todayPlan !== undefined) data.todayPlan = todayPlan;
    if (completedItems !== undefined) data.completedItems = JSON.stringify(completedItems);
    if (blockers !== undefined) data.blockers = JSON.stringify(blockers);

    const checkIn = await prisma.checkIn.upsert({
      where: { userId_date: { userId: session.user.id, date: today } },
      create: { userId: session.user.id, date: today, ...data },
      update: data,
    });

    return NextResponse.json({
      date: checkIn.date.toISOString(),
      currentFocus: checkIn.currentFocus,
      destination: checkIn.destination,
      todayPlan: checkIn.todayPlan,
      completedItems: safeParseJSON(checkIn.completedItems),
      blockers: safeParseJSON(checkIn.blockers),
    });
  } catch (e) {
    console.error("CheckIn POST error:", e);
    return NextResponse.json({ error: "保存签到失败" }, { status: 500 });
  }
}

function safeParseJSON(str: string | null): unknown {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

function analyzePatterns(checkIns: Array<{
  completedItems: unknown;
  blockers: unknown;
}>) {
  const patterns: {
    completionStreak: number;
    commonBlockers: Array<{ reason: string; count: number }>;
    completedTypes: Record<string, number>;
    suggestion: string | null;
  } = {
    completionStreak: 0,
    commonBlockers: [],
    completedTypes: {},
    suggestion: null,
  };

  // Calculate completion streak
  for (const c of checkIns) {
    const items = Array.isArray(c.completedItems) ? c.completedItems : [];
    if (items.length > 0) {
      patterns.completionStreak++;
    } else {
      break;
    }
  }

  // Count blocker reasons
  const reasonCounts: Record<string, number> = {};
  for (const c of checkIns) {
    const blockers = Array.isArray(c.blockers) ? c.blockers : [];
    for (const b of blockers) {
      if (b && typeof b === "object" && "reason" in b) {
        const reason = (b as { reason: string }).reason;
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      }
    }
  }
  patterns.commonBlockers = Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  // Generate suggestion based on patterns
  if (patterns.completionStreak >= 3) {
    patterns.suggestion = "你已经连续完成了，要不要试试提高难度？";
  } else if (patterns.commonBlockers.length > 0) {
    const top = patterns.commonBlockers[0];
    if (top.count >= 3) {
      const reasonMap: Record<string, string> = {
        forgot: "你连续三次因为「忘了」没完成，要不要换个提醒方式？",
        afraid: "你连续三次因为「怕了」没完成，要不要拆成更小的步骤？",
        unimportant: "你连续三次觉得这事「不重要」，是不是该重新评估这个目标？",
        other: "这个阻碍出现了三次，要不要聊聊？",
      };
      patterns.suggestion = reasonMap[top.reason] || reasonMap.other;
    }
  }

  return patterns;
}
