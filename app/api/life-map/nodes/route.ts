import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = ["pending", "active", "completed", "skipped"];

// POST /api/life-map/nodes - Create a node
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { lifePathId, title, description, abilityTags, nextSuggestions } = body;

    if (!lifePathId || !title?.trim()) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    // Verify path ownership
    const path = await prisma.lifePath.findUnique({
      where: { id: lifePathId },
      include: { lifeMap: true },
    });
    if (!path || path.lifeMap.userId !== session.user.id) {
      return NextResponse.json({ error: "路径不存在" }, { status: 404 });
    }

    // Get next position
    const maxPos = await prisma.lifeNode.findFirst({
      where: { lifePathId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const node = await prisma.lifeNode.create({
      data: {
        lifePathId,
        title: title.trim(),
        description: description || null,
        abilityTags: abilityTags ? JSON.stringify(abilityTags) : null,
        nextSuggestions: nextSuggestions ? JSON.stringify(nextSuggestions) : null,
        position: (maxPos?.position ?? -1) + 1,
      },
      include: { branches: true },
    });

    return NextResponse.json({ node }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建节点失败" }, { status: 500 });
  }
}

// PATCH /api/life-map/nodes - Update a node
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, title, description, status, abilityTags, historyNotes, nextSuggestions } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少节点 ID" }, { status: 400 });
    }

    const existing = await prisma.lifeNode.findUnique({
      where: { id },
      include: { lifePath: { include: { lifeMap: true } } },
    });
    if (!existing || existing.lifePath.lifeMap.userId !== session.user.id) {
      return NextResponse.json({ error: "节点不存在" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (status !== undefined && VALID_STATUSES.includes(status)) updateData.status = status;
    if (abilityTags !== undefined) updateData.abilityTags = JSON.stringify(abilityTags);
    if (historyNotes !== undefined) updateData.historyNotes = JSON.stringify(historyNotes);
    if (nextSuggestions !== undefined) updateData.nextSuggestions = JSON.stringify(nextSuggestions);

    const node = await prisma.lifeNode.update({
      where: { id },
      data: updateData,
      include: { branches: true },
    });

    return NextResponse.json({ node });
  } catch {
    return NextResponse.json({ error: "更新节点失败" }, { status: 500 });
  }
}

// DELETE /api/life-map/nodes?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少节点 ID" }, { status: 400 });
    }

    const existing = await prisma.lifeNode.findUnique({
      where: { id },
      include: { lifePath: { include: { lifeMap: true } } },
    });
    if (!existing || existing.lifePath.lifeMap.userId !== session.user.id) {
      return NextResponse.json({ error: "节点不存在" }, { status: 404 });
    }

    await prisma.lifeNode.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "删除节点失败" }, { status: 500 });
  }
}
