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

function parseSkillFrontmatter(content: string) {
  const lines = content.split("\n");
  let inFrontmatter = false;
  let description = "";
  const nameMatch = content.match(/^# (.+)/m);
  const name = nameMatch ? nameMatch[1].trim() : "Unknown";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "---") {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter && trimmed.startsWith("description:")) {
      description = trimmed.replace("description:", "").trim();
      if (description === "|") {
        // Multi-line YAML - read next lines
        description = "";
        continue;
      }
    }
    if (inFrontmatter && description === "" && trimmed.startsWith("  ")) {
      description += trimmed.trim() + " ";
    }
  }

  return { name, description: description.trim() || name };
}

// GET /api/perspectives - List all available perspective skills
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const perspectives: Array<{
      id: string;
      name: string;
      description: string;
      tagline: string;
    }> = [];

    if (!fs.existsSync(SKILLS_DIR)) {
      return NextResponse.json({ perspectives: [] });
    }

    const items = fs.readdirSync(SKILLS_DIR);
    for (const item of items) {
      if (!item.endsWith("-perspective") && item !== "x-mastery-mentor") continue;

      const skillPath = path.join(SKILLS_DIR, item, "SKILL.md");
      if (!fs.existsSync(skillPath)) continue;

      const content = fs.readFileSync(skillPath, "utf-8");
      const { name, description } = parseSkillFrontmatter(content);

      // Extract tagline (first blockquote)
      const quoteMatch = content.match(/> (.+)/);
      const tagline = quoteMatch ? quoteMatch[1].trim() : "";

      perspectives.push({
        id: item,
        name,
        description: description || tagline,
        tagline,
      });
    }

    return NextResponse.json({ perspectives });
  } catch (error) {
    return NextResponse.json(
      { error: "获取视角列表失败" },
      { status: 500 }
    );
  }
}
