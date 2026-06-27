import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/goals/[id]/milestones - Add a milestone to a goal
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id: goalId } = await params;

  try {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== session.user.id) {
      return NextResponse.json({ error: "目标不存在" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, dueDate } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "里程碑标题不能为空" }, { status: 400 });
    }

    const milestone = await prisma.milestone.create({
      data: {
        goalId,
        title: title.trim(),
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    return NextResponse.json({ milestone }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "添加里程碑失败" }, { status: 500 });
  }
}

// PATCH /api/goals/[id]/milestones - Update a milestone
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { milestoneId, title, description, status, dueDate } = body;

    if (!milestoneId) {
      return NextResponse.json({ error: "缺少里程碑 ID" }, { status: 400 });
    }

    const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone) {
      return NextResponse.json({ error: "里程碑不存在" }, { status: 404 });
    }

    // Verify goal ownership
    const goal = await prisma.goal.findUnique({ where: { id: milestone.goalId } });
    if (!goal || goal.userId !== session.user.id) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "completed") updateData.completedAt = new Date();
    }
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: updateData,
    });

    return NextResponse.json({ milestone: updated });
  } catch {
    return NextResponse.json({ error: "更新里程碑失败" }, { status: 500 });
  }
}

// DELETE /api/goals/[id]/milestones - Delete a milestone
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const milestoneId = searchParams.get("milestoneId");

    if (!milestoneId) {
      return NextResponse.json({ error: "缺少里程碑 ID" }, { status: 400 });
    }

    const milestone = await prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!milestone) {
      return NextResponse.json({ error: "里程碑不存在" }, { status: 404 });
    }

    const goal = await prisma.goal.findUnique({ where: { id: milestone.goalId } });
    if (!goal || goal.userId !== session.user.id) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    await prisma.milestone.delete({ where: { id: milestoneId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "删除里程碑失败" }, { status: 500 });
  }
}
