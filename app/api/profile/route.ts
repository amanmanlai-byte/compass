import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_LIFE_STAGES = ["student", "working", "freelance", "entrepreneur"];

function validate(body: Record<string, unknown>): string | null {
  if (body.bio !== undefined && body.bio !== null && typeof body.bio === "string" && body.bio.length > 200) return "简介过长";
  if (body.lifeStage !== undefined && body.lifeStage !== null && !VALID_LIFE_STAGES.includes(body.lifeStage as string)) return "无效的人生阶段";
  if (body.currentFocus !== undefined && body.currentFocus !== null && typeof body.currentFocus === "string" && body.currentFocus.length > 200) return "当前焦点过长";
  if (body.coreValues !== undefined && body.coreValues !== null && typeof body.coreValues !== "string") return "核心价值观格式错误";
  if (body.strengths !== undefined && body.strengths !== null && typeof body.strengths !== "string") return "优势格式错误";
  if (body.weaknesses !== undefined && body.weaknesses !== null && typeof body.weaknesses !== "string") return "劣势格式错误";
  if (body.interests !== undefined && body.interests !== null && typeof body.interests !== "string") return "兴趣格式错误";
  return null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    // Verify user exists first (database may have been reset)
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在，请重新登录", code: "USER_NOT_FOUND" }, { status: 401 });
    }

    let profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      profile = await prisma.userProfile.create({
        data: { userId: session.user.id },
      });
    }

    const { id, userId, ...rest } = profile;
    return NextResponse.json(rest);
  } catch (e) {
    console.error("Profile GET error:", e);
    return NextResponse.json({ error: "获取档案失败" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "用户不存在，请重新登录", code: "USER_NOT_FOUND" }, { status: 401 });
    }

    const validationError = validate(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Upsert profile
    await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id },
      update: {},
    });

    const ALLOWED_FIELDS = ["bio", "lifeStage", "coreValues", "strengths", "weaknesses", "interests", "currentFocus", "onboardingDone", "avatar", "aiStyle"];
    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "没有要更新的字段" }, { status: 400 });
    }

    const updated = await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: updateData,
    });

    const { id, userId, ...rest } = updated;
    return NextResponse.json(rest);
  } catch (e) {
    console.error("Profile PATCH error:", e);
    return NextResponse.json({ error: "更新档案失败" }, { status: 500 });
  }
}
