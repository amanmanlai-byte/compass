import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CATEGORIES = ["fact", "preference", "goal", "emotion", "decision", "habit"];

// GET /api/memories - List memories
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("q");

    const where: Record<string, unknown> = { userId: session.user.id };
    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }
    if (search) {
      where.content = { contains: search };
    }

    const memories = await prisma.memory.findMany({
      where,
      orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
      take: 100,
    });

    return NextResponse.json({ memories });
  } catch {
    return NextResponse.json({ error: "获取记忆失败" }, { status: 500 });
  }
}

// POST /api/memories - Create a memory
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { category, content, importance } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "记忆内容不能为空" }, { status: 400 });
    }
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: "无效的记忆分类" }, { status: 400 });
    }

    const memory = await prisma.memory.create({
      data: {
        userId: session.user.id,
        category: category || "fact",
        content: content.trim(),
        importance: typeof importance === "number" ? Math.max(0, Math.min(10, importance)) : 5,
      },
    });

    return NextResponse.json({ memory }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建记忆失败" }, { status: 500 });
  }
}

// PATCH /api/memories - Update a memory
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, category, content, importance } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少记忆 ID" }, { status: 400 });
    }

    const existing = await prisma.memory.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "记忆不存在" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (category !== undefined && VALID_CATEGORIES.includes(category)) updateData.category = category;
    if (content !== undefined) updateData.content = content.trim();
    if (importance !== undefined) updateData.importance = Math.max(0, Math.min(10, importance));

    const memory = await prisma.memory.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ memory });
  } catch {
    return NextResponse.json({ error: "更新记忆失败" }, { status: 500 });
  }
}

// DELETE /api/memories - Delete a memory
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少记忆 ID" }, { status: 400 });
    }

    const existing = await prisma.memory.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "记忆不存在" }, { status: 404 });
    }

    await prisma.memory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "删除记忆失败" }, { status: 500 });
  }
}
