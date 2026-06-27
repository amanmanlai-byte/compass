import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS = {
  theme: "system",
  fontSize: "md",
  bubbleStyle: "modern",
  fontFamily: "system",
  codeTheme: "github",
  language: "zh",
  systemPrompt: "",
  streamingEnabled: true,
  temperature: 0.7,
  maxTokens: 4096,
  frequencyPenalty: 0.0,
  presencePenalty: 0.0,
  contextLength: 20,
  localEndpointUrl: "http://localhost:11434",
  defaultModel: "openai:gpt-4o-mini",
};

const ALLOWED_FIELDS = [
  "theme", "fontSize", "bubbleStyle", "fontFamily", "codeTheme",
  "language", "systemPrompt", "streamingEnabled",
  "temperature", "maxTokens", "frequencyPenalty", "presencePenalty",
  "contextLength", "localEndpointUrl", "defaultModel", "agentAvatar",
];

const VALID_THEMES = ["light", "dark", "system"];
const VALID_FONT_SIZES = ["sm", "md", "lg"];
const VALID_BUBBLE_STYLES = ["modern", "minimal", "terminal", "cute"];
const VALID_FONT_FAMILIES = ["system", "jetbrains-mono", "pingfang"];
const VALID_CODE_THEMES = ["github", "dracula", "nord", "one-dark", "solarized"];
const VALID_LANGUAGES = ["zh", "en"];

function validateSettingsInput(body: Record<string, unknown>): string | null {
  if (body.theme !== undefined && !VALID_THEMES.includes(body.theme as string)) return "无效的主题设置";
  if (body.fontSize !== undefined && !VALID_FONT_SIZES.includes(body.fontSize as string)) return "无效的字号设置";
  if (body.bubbleStyle !== undefined && !VALID_BUBBLE_STYLES.includes(body.bubbleStyle as string)) return "无效的气泡风格";
  if (body.fontFamily !== undefined && !VALID_FONT_FAMILIES.includes(body.fontFamily as string)) return "无效的字体设置";
  if (body.codeTheme !== undefined && !VALID_CODE_THEMES.includes(body.codeTheme as string)) return "无效的代码主题";
  if (body.language !== undefined && !VALID_LANGUAGES.includes(body.language as string)) return "无效的语言设置";
  if (body.temperature !== undefined) {
    const t = body.temperature as number;
    if (typeof t !== "number" || t < 0 || t > 2) return "温度值需在 0-2 之间";
  }
  if (body.maxTokens !== undefined) {
    const m = body.maxTokens as number;
    if (typeof m !== "number" || m < 1 || m > 128000) return "最大 Token 数需在 1-128000 之间";
  }
  if (body.contextLength !== undefined) {
    const c = body.contextLength as number;
    if (typeof c !== "number" || c < 1 || c > 100) return "上下文长度需在 1-100 之间";
  }
  if (body.localEndpointUrl !== undefined) {
    const url = body.localEndpointUrl as string;
    if (typeof url !== "string" || url.length > 2048) return "端点地址过长";
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) return "端点地址协议无效";
    } catch {
      return "端点地址格式无效";
    }
  }
  if (body.systemPrompt !== undefined && typeof body.systemPrompt === "string" && body.systemPrompt.length > 10000) {
    return "系统提示词过长";
  }
  return null;
}

async function getOrCreateSettings(userId: string) {
  let settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    settings = await prisma.userSettings.create({
      data: { userId, ...DEFAULT_SETTINGS },
    });
  }

  return settings;
}

// GET /api/settings - Get current user settings (returns direct object, not wrapped)
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const settings = await getOrCreateSettings(session.user.id);
    const { id, userId, ...rest } = settings;
    return NextResponse.json(rest);
  } catch (error) {
    return NextResponse.json(
      { error: "获取设置失败" },
      { status: 500 }
    );
  }
}

// PATCH /api/settings - Update user settings
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    await getOrCreateSettings(session.user.id);

    const validationError = validateSettingsInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "没有要更新的字段" }, { status: 400 });
    }

    const updated = await prisma.userSettings.update({
      where: { userId: session.user.id },
      data: updateData,
    });

    const { id, userId, ...rest } = updated;
    return NextResponse.json(rest);
  } catch (error) {
    return NextResponse.json(
      { error: "更新设置失败" },
      { status: 500 }
    );
  }
}
