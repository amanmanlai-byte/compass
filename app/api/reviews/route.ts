import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/reviews - List reviews for current user
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "weekly";

    const reviews = await prisma.review.findMany({
      where: { userId: session.user.id, period },
      orderBy: { periodStart: "desc" },
      take: 12,
    });

    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ error: "获取复盘失败" }, { status: 500 });
  }
}

// POST /api/reviews - Generate a review for a period
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { period, periodStart, periodEnd } = body;

    if (!period || !periodStart || !periodEnd) {
      return NextResponse.json({ error: "缺少参数" }, { status: 400 });
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Get conversations in this period
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: start, lte: end },
      },
      include: { messages: { select: { content: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Get goals progress
    const goals = await prisma.goal.findMany({
      where: { userId: session.user.id },
      include: { milestones: true },
    });

    // Build context for review generation
    const conversationSummaries = conversations.map((c) => {
      const userMsgs = c.messages.filter((m) => m.role === "user").map((m) => m.content.slice(0, 100));
      return `- ${c.title}: ${userMsgs.slice(0, 3).join("; ")}`;
    }).join("\n");

    const goalProgress = goals.map((g) => {
      const completed = g.milestones.filter((m) => m.status === "completed").length;
      return `- ${g.title} (${g.status}): ${completed}/${g.milestones.length} 里程碑`;
    }).join("\n");

    // Generate review summary (pattern-based, no extra LLM call)
    const summaryParts: string[] = [];
    summaryParts.push(`本期共 ${conversations.length} 次对话。`);

    if (conversations.length > 0) {
      const topics = conversations.map((c) => c.title).slice(0, 5);
      summaryParts.push(`主要话题: ${topics.join("、")}。`);
    }

    // Detect themes from conversation titles
    const themes: string[] = [];
    const allTitles = conversations.map((c) => c.title).join(" ");
    if (/目标|计划|打算/.test(allTitles)) themes.push("目标规划");
    if (/决策|选择|决定/.test(allTitles)) themes.push("决策思考");
    if (/复盘|回顾|总结/.test(allTitles)) themes.push("复盘反思");
    if (/焦虑|迷茫|压力/.test(allTitles)) themes.push("情绪管理");
    if (/学习|提升|成长/.test(allTitles)) themes.push("学习成长");
    if (/职业|工作|跳槽/.test(allTitles)) themes.push("职业发展");
    if (themes.length > 0) summaryParts.push(`核心主题: ${themes.join("、")}。`);

    if (goalProgress) summaryParts.push(`目标进展:\n${goalProgress}`);

    const summary = summaryParts.join("\n");

    // Extract achievements and challenges
    const achievements = conversations.length > 0
      ? conversations.slice(0, 3).map((c) => c.title)
      : ["本周暂无对话记录"];

    const challenges = themes.filter((t) => ["情绪管理", "决策思考"].includes(t));

    // Find existing review or create/update
    const existing = await prisma.review.findFirst({
      where: { userId: session.user.id, period, periodStart: start },
    });

    let review;
    if (existing) {
      review = await prisma.review.update({
        where: { id: existing.id },
        data: { summary, achievements: JSON.stringify(achievements), challenges: JSON.stringify(challenges.length > 0 ? challenges : ["暂无明显挑战"]), periodEnd: end },
      });
    } else {
      review = await prisma.review.create({
        data: {
          userId: session.user.id,
          period,
          periodStart: start,
          periodEnd: end,
          summary,
          achievements: JSON.stringify(achievements),
          challenges: JSON.stringify(challenges.length > 0 ? challenges : ["暂无明显挑战"]),
        },
      });
    }

    return NextResponse.json({ review });
  } catch {
    return NextResponse.json({ error: "生成复盘失败" }, { status: 500 });
  }
}
