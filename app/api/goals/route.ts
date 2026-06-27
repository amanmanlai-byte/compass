import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["career", "skill", "health", "finance", "relationship", "custom"];
const VALID_STATUSES = ["active", "completed", "paused", "abandoned"];

// GET /api/goals - List all goals for current user
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: Record<string, unknown> = { userId: session.user.id };
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    const goals = await prisma.goal.findMany({
      where,
      include: { milestones: true },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ goals });
  } catch {
    return NextResponse.json({ error: "获取目标失败" }, { status: 500 });
  }
}

// POST /api/goals - Create a new goal
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, description, category, targetDate, milestones } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "目标标题不能为空" }, { status: 400 });
    }
    if (title.length > 100) {
      return NextResponse.json({ error: "目标标题过长" }, { status: 400 });
    }
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "无效的目标分类" }, { status: 400 });
    }

    const goal = await prisma.goal.create({
      data: {
        userId: session.user.id,
        title: title.trim(),
        description: description || null,
        category: category || "custom",
        targetDate: targetDate ? new Date(targetDate) : null,
        milestones: milestones && Array.isArray(milestones)
          ? {
              create: milestones.map((m: { title: string; description?: string; dueDate?: string }) => ({
                title: m.title,
                description: m.description || null,
                dueDate: m.dueDate ? new Date(m.dueDate) : null,
              })),
            }
          : undefined,
      },
      include: { milestones: true },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建目标失败" }, { status: 500 });
  }
}

// PATCH /api/goals - Update a goal
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, title, description, category, status, priority, targetDate } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少目标 ID" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.goal.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "目标不存在" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (category !== undefined && VALID_CATEGORIES.includes(category)) updateData.category = category;
    if (status !== undefined && VALID_STATUSES.includes(status)) {
      updateData.status = status;
      if (status === "completed") updateData.completedAt = new Date();
    }
    if (priority !== undefined) updateData.priority = priority;
    if (targetDate !== undefined) updateData.targetDate = targetDate ? new Date(targetDate) : null;

    const goal = await prisma.goal.update({
      where: { id },
      data: updateData,
      include: { milestones: true },
    });

    return NextResponse.json({ goal });
  } catch {
    return NextResponse.json({ error: "更新目标失败" }, { status: 500 });
  }
}

// DELETE /api/goals - Delete a goal
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少目标 ID" }, { status: 400 });
    }

    const existing = await prisma.goal.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "目标不存在" }, { status: 404 });
    }

    await prisma.goal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "删除目标失败" }, { status: 500 });
  }
}
