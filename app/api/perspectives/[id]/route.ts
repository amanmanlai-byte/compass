import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SKILLS_DIR = path.join(
  process.env.LOCALAPPDATA || "",
  "hermes",
  "skills"
);

// GET /api/perspectives/[id] - Get full perspective skill content
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await params;

  // Security: prevent path traversal
  if (id.includes("..") || id.includes("/") || id.includes("\\")) {
    return NextResponse.json({ error: "无效的视角ID" }, { status: 400 });
  }

  const skillPath = path.join(SKILLS_DIR, id, "SKILL.md");
  if (!fs.existsSync(skillPath)) {
    return NextResponse.json({ error: "视角不存在" }, { status: 404 });
  }

  try {
    const content = fs.readFileSync(skillPath, "utf-8");
    return NextResponse.json({ id, content });
  } catch {
    return NextResponse.json({ error: "读取视角失败" }, { status: 500 });
  }
}
