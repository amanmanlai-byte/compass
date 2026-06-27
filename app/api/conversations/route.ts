import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/conversations - List all conversations for the current user
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在，请重新登录", code: "USER_NOT_FOUND" }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: session.user.id },
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      include: {
        _count: { select: { messages: true } },
      },
    });

    const result = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      model: conv.model,
      pinned: conv.pinned,
      updatedAt: conv.updatedAt.toISOString(),
      messageCount: conv._count.messages,
    }));

    return NextResponse.json({ conversations: result });
  } catch (error) {
    return NextResponse.json(
      { error: "获取会话列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在，请重新登录", code: "USER_NOT_FOUND" }, { status: 401 });
    }

    const body = await req.json();
    const { title, model } = body;

    const conversation = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        title: title || "新对话",
        model: model || "openai:gpt-4o-mini",
      },
    });

    return NextResponse.json(
      {
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        pinned: conversation.pinned,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messageCount: 0,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "创建会话失败" },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations - Delete multiple conversations
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在，请重新登录", code: "USER_NOT_FOUND" }, { status: 401 });
    }

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "请提供要删除的会话 ID 列表" }, { status: 400 });
    }

    // Only delete conversations owned by the current user
    const result = await prisma.conversation.deleteMany({
      where: {
        id: { in: ids },
        userId: session.user.id,
      },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    return NextResponse.json(
      { error: "删除会话失败" },
      { status: 500 }
    );
  }
}
