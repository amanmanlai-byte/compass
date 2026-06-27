import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { decryptApiKey } from "@/lib/db/encryption";
import { getAdapter } from "@/lib/models/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/settings/apikeys/test - Test a provider's API key
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { provider, key: directKey } = body;

    if (!provider) {
      return NextResponse.json(
        { error: "请提供要测试的提供商名称" },
        { status: 400 }
      );
    }

    const normalizedProvider = provider.toLowerCase();

    // Get API key: use direct key from request body, or fetch from DB
    let apiKey: string;

    if (directKey) {
      apiKey = directKey;
    } else {
      // Fetch the stored API key
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: {
          userId_provider: {
            userId: session.user.id,
            provider: normalizedProvider,
          },
        },
      });

      if (!apiKeyRecord) {
        return NextResponse.json(
          { error: `尚未配置 ${normalizedProvider} 的 API Key` },
          { status: 404 }
        );
      }

      // Decrypt the key
      try {
        apiKey = decryptApiKey(apiKeyRecord.key);
      } catch {
        return NextResponse.json(
          { error: "API Key 解密失败，请重新设置" },
          { status: 500 }
        );
      }
    }

    // Get the adapter and test with a simple request
    let adapter;
    try {
      adapter = getAdapter(normalizedProvider);
    } catch {
      return NextResponse.json(
        { error: `不支持的提供商: ${normalizedProvider}` },
        { status: 400 }
      );
    }

    // Test by making a simple API call with a minimal message
    try {
      const testMessages = [
        { role: "user" as const, content: "Hello" },
      ];
      const responseContent: string[] = [];

      const DEFAULT_TEST_MODELS: Record<string, string> = {
        openai: "gpt-4o-mini",
        anthropic: "claude-3-5-haiku-20241022",
        google: "gemini-2.0-flash",
        deepseek: "deepseek-chat",
        groq: "llama-3.1-8b-instant",
        mistral: "mistral-small",
        xai: "grok-2-mini",
        moonshot: "moonshot-v1-8k",
        qwen: "qwen-turbo",
        glm: "glm-4-flash",
        cohere: "command-r",
        perplexity: "llama-3.1-sonar-large-128k-online",
      };

      const stream = adapter.stream(testMessages, apiKey, {
        model: DEFAULT_TEST_MODELS[normalizedProvider] || "",
        temperature: 0.1,
        maxTokens: 10,
      });

      for await (const chunk of stream) {
        if (typeof chunk === "string") {
          responseContent.push(chunk);
        }
        // Only collect first few chunks for the test
        if (responseContent.join("").length > 20) break;
      }

      return NextResponse.json({
        success: true,
        message: `${normalizedProvider} API Key 测试通过`,
        response: responseContent.join("").slice(0, 100),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "未知错误";
      return NextResponse.json({
        success: false,
        message: `${normalizedProvider} API Key 测试失败`,
        error: errorMsg,
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: "测试 API Key 失败" },
      { status: 500 }
    );
  }
}
