import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { encryptApiKey, decryptApiKey } from "@/lib/db/encryption";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/settings/apikeys - Get all API keys (masked)
export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { provider: "asc" },
    });

    const masked = apiKeys.map((key) => ({
      id: key.id,
      provider: key.provider,
      // Show only first 4 and last 4 characters
      keyMasked: maskKey(key.key),
      createdAt: key.createdAt.toISOString(),
      updatedAt: key.updatedAt.toISOString(),
    }));

    return NextResponse.json({ apiKeys: masked });
  } catch (error) {
    return NextResponse.json(
      { error: "获取 API Key 列表失败" },
      { status: 500 }
    );
  }
}

// POST /api/settings/apikeys - Save a new API key (or update existing)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { provider, key } = body;

    if (!provider || !key) {
      return NextResponse.json(
        { error: "请提供提供商和 API Key" },
        { status: 400 }
      );
    }

    // Encrypt the key
    let encrypted: string;
    try {
      encrypted = encryptApiKey(key);
    } catch {
      return NextResponse.json(
        { error: "API Key 加密失败" },
        { status: 500 }
      );
    }

    // Upsert: create or update
    const apiKey = await prisma.apiKey.upsert({
      where: {
        userId_provider: {
          userId: session.user.id,
          provider: provider.toLowerCase(),
        },
      },
      update: { key: encrypted },
      create: {
        userId: session.user.id,
        provider: provider.toLowerCase(),
        key: encrypted,
      },
    });

    return NextResponse.json(
      {
        id: apiKey.id,
        provider: apiKey.provider,
        keyMasked: maskKey(apiKey.key),
        createdAt: apiKey.createdAt.toISOString(),
        updatedAt: apiKey.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "保存 API Key 失败" },
      { status: 500 }
    );
  }
}

function maskKey(encrypted: string): string {
  // encrypted format is "iv:authTag:ciphertext" (hex)
  // We need to decrypt first to know the actual key length for proper masking
  try {
    const plaintext = decryptApiKey(encrypted);
    if (plaintext.length <= 8) {
      return plaintext.slice(0, 2) + "****" + plaintext.slice(-2);
    }
    return plaintext.slice(0, 4) + "****" + plaintext.slice(-4);
  } catch {
    // If we can't decrypt, mask the encrypted string itself
    if (encrypted.length <= 8) {
      return "****";
    }
    return encrypted.slice(0, 4) + "****" + encrypted.slice(-4);
  }
}
