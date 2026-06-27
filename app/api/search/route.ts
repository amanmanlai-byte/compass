import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "请提供搜索关键词" }, { status: 400 });
    }

    const results = await searchWeb(query.trim());
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: "搜索失败" }, { status: 500 });
  }
}

async function searchWeb(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const encodedQuery = encodeURIComponent(query);

  // DuckDuckGo HTML lite search
  const url = `https://lite.duckduckgo.com/lite/?q=${encodedQuery}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AIChatBot/1.0)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return [];

    const html = await response.text();
    return parseDDGLite(html).slice(0, 8);
  } catch {
    return [];
  }
}

function parseDDGLite(html: string): Array<{ title: string; url: string; snippet: string }> {
  const results: Array<{ title: string; url: string; snippet: string }> = [];

  const resultRegex = /<a[^>]+class="result-link"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;

  const links: string[] = [];
  const titles: string[] = [];
  const snippets: string[] = [];

  let match;
  while ((match = resultRegex.exec(html)) !== null) {
    links.push(match[1]);
    titles.push(match[2].replace(/<[^>]+>/g, "").trim());
  }

  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
  }

  for (let i = 0; i < Math.min(links.length, 8); i++) {
    const href = links[i];
    if (!href || href.startsWith("/")) continue;
    results.push({
      title: titles[i] || "",
      url: href,
      snippet: snippets[i] || "",
    });
  }

  return results;
}
