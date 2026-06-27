import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getModelsByProvider } from "@/lib/models/registry";
import prisma from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getLocalModels(userId: string): Promise<Array<{ id: string; name: string; provider: string; supportsStreaming: boolean; maxTokens: number }>> {
  try {
    const settings = await prisma.userSettings.findUnique({ where: { userId } });
    const endpoint = settings?.localEndpointUrl || "http://localhost:11434";
    const res = await fetch(`${endpoint}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.models) return [];
    return data.models.map((m: { name: string }) => ({
      id: m.name,
      name: m.name,
      provider: "local",
      supportsStreaming: true,
      maxTokens: 128000,
    }));
  } catch {
    return [];
  }
}

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const grouped = getModelsByProvider();

    const localModels = await getLocalModels(session.user.id);
    if (localModels.length > 0) {
      grouped["local"] = localModels;
    }

    return NextResponse.json({ models: grouped });
  } catch (error) {
    return NextResponse.json(
      { error: "获取模型列表失败" },
      { status: 500 }
    );
  }
}
