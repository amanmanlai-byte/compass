import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/conversations/[id] - Get a single conversation with its messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: session.user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            tokens: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      model: conversation.model,
      pinned: conversation.pinned,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        tokens: msg.tokens,
        createdAt: msg.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "获取会话失败" },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[id] - Rename or pin/unpin a conversation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { title, pinned } = body;

    // Verify ownership
    const existing = await prisma.conversation.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (pinned !== undefined) updateData.pinned = pinned;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "没有要更新的字段" }, { status: 400 });
    }

    const updated = await prisma.conversation.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      model: updated.model,
      pinned: updated.pinned,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "更新会话失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - Delete a single conversation
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Verify ownership
    const existing = await prisma.conversation.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    await prisma.conversation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "删除会话失败" },
      { status: 500 }
    );
  }
}
