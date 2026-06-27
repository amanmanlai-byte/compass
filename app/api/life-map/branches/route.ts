import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/life-map/branches - Create a branch
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { lifeNodeId, title, description, abandonReason, cost, consequence } = body;

    if (!lifeNodeId || !title?.trim()) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const node = await prisma.lifeNode.findUnique({
      where: { id: lifeNodeId },
      include: { lifePath: { include: { lifeMap: true } } },
    });
    if (!node || node.lifePath.lifeMap.userId !== session.user.id) {
      return NextResponse.json({ error: "节点不存在" }, { status: 404 });
    }

    const branch = await prisma.lifeBranch.create({
      data: {
        lifeNodeId,
        title: title.trim(),
        description: description || null,
        abandonReason: abandonReason || null,
        cost: cost || null,
        consequence: consequence || null,
      },
    });

    return NextResponse.json({ branch }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建分支失败" }, { status: 500 });
  }
}

// PATCH /api/life-map/branches - Update a branch
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, title, description, abandonReason, cost, consequence, active } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少分支 ID" }, { status: 400 });
    }

    const existing = await prisma.lifeBranch.findUnique({
      where: { id },
      include: { lifeNode: { include: { lifePath: { include: { lifeMap: true } } } } },
    });
    if (!existing || existing.lifeNode.lifePath.lifeMap.userId !== session.user.id) {
      return NextResponse.json({ error: "分支不存在" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (abandonReason !== undefined) updateData.abandonReason = abandonReason;
    if (cost !== undefined) updateData.cost = cost;
    if (consequence !== undefined) updateData.consequence = consequence;
    if (active !== undefined) updateData.active = active;

    const branch = await prisma.lifeBranch.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ branch });
  } catch {
    return NextResponse.json({ error: "更新分支失败" }, { status: 500 });
  }
}

// DELETE /api/life-map/branches?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "缺少分支 ID" }, { status: 400 });
    }

    const existing = await prisma.lifeBranch.findUnique({
      where: { id },
      include: { lifeNode: { include: { lifePath: { include: { lifeMap: true } } } } },
    });
    if (!existing || existing.lifeNode.lifePath.lifeMap.userId !== session.user.id) {
      return NextResponse.json({ error: "分支不存在" }, { status: 404 });
    }

    await prisma.lifeBranch.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "删除分支失败" }, { status: 500 });
  }
}
