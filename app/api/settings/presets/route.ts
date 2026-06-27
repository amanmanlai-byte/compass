import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/settings/presets - List all preset prompts for the current user
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const presets = await prisma.presetPrompt.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      presets: presets.map((p) => ({
        id: p.id,
        name: p.name,
        content: p.content,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "获取预设提示词列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/settings/presets - Create a new preset prompt
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, content } = body;

    if (!name || !content) {
      return NextResponse.json(
        { error: "请提供预设名称和内容" },
        { status: 400 }
      );
    }

    const preset = await prisma.presetPrompt.create({
      data: {
        userId: session.user.id,
        name,
        content,
      },
    });

    return NextResponse.json(
      {
        id: preset.id,
        name: preset.name,
        content: preset.content,
        createdAt: preset.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "创建预设提示词失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/presets - Delete a preset prompt
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "请提供预设 ID" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.presetPrompt.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "预设提示词不存在" }, { status: 404 });
    }

    await prisma.presetPrompt.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "删除预设提示词失败" },
      { status: 500 }
    );
  }
}

// PATCH /api/settings/presets - Update a preset prompt
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, content } = body;

    if (!id) {
      return NextResponse.json({ error: "请提供预设 ID" }, { status: 400 });
    }

    // Verify ownership
    const existing = await prisma.presetPrompt.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "预设提示词不存在" }, { status: 404 });
    }

    const updateData: Record<string, string> = {};
    if (name !== undefined) updateData.name = name;
    if (content !== undefined) updateData.content = content;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "没有要更新的字段" }, { status: 400 });
    }

    const updated = await prisma.presetPrompt.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      content: updated.content,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "更新预设提示词失败" },
      { status: 500 }
    );
  }
}
