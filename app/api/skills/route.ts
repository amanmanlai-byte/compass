import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/skills - List skill tags for current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const skills = await prisma.skillTag.findMany({
      where: { userId: session.user.id },
      orderBy: { level: "desc" },
    });

    return NextResponse.json({ skills });
  } catch {
    return NextResponse.json({ error: "获取技能标签失败" }, { status: 500 });
  }
}

// POST /api/skills - Update or create a skill tag
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, level, evidence } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "标签名不能为空" }, { status: 400 });
    }

    const existing = await prisma.skillTag.findUnique({
      where: { userId_name: { userId: session.user.id, name: name.trim() } },
    });

    let skill;
    if (existing) {
      const updateData: Record<string, unknown> = { lastAssessedAt: new Date() };
      if (level !== undefined) updateData.level = Math.max(1, Math.min(10, level));
      if (evidence !== undefined) updateData.evidence = JSON.stringify(evidence);

      skill = await prisma.skillTag.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      skill = await prisma.skillTag.create({
        data: {
          userId: session.user.id,
          name: name.trim(),
          level: level || 1,
          evidence: evidence ? JSON.stringify(evidence) : null,
          lastAssessedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ skill });
  } catch {
    return NextResponse.json({ error: "更新技能标签失败" }, { status: 500 });
  }
}
