import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db/prisma";
import { decryptApiKey } from "@/lib/db/encryption";
import { getAdapter, OpenAICompatibleAdapter } from "@/lib/models/registry";
import type { ChatMessage, ToolCall } from "@/lib/types";
import { registerAllTools, getToolDefinitions, executeTool } from "@/lib/agent/tool-registry";
import { URL } from "url";

const BLOCKED_HOSTNAMES = new Set([
  "localhost", "127.0.0.1", "0.0.0.0", "::1",
  "metadata.google.internal", "169.254.169.254",
]);
const PRIVATE_IP_PREFIXES = ["10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.", "192.168."];

function isAllowedEndpoint(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(hostname)) return false;
    if (PRIVATE_IP_PREFIXES.some((prefix) => hostname.startsWith(prefix))) return false;
    if (hostname === "0.0.0.0" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPASS_COACH_PROMPT = `你是 Compass。你不是一个聊天机器人，你是一个人生Agent。

## 你的核心职责

1. **理解用户长期目标** - 不只是听他们说什么，而是理解他们想成为什么样的人
2. **维护人生地图** - 帮用户把人生可视化：位置、路径、方向
3. **管理长期记忆** - 记住重要的事，忘掉不重要的事
4. **拆解目标** - 把大目标变成可执行的小步骤
5. **追踪进展** - 用户做到了什么，卡在了哪里
6. **发现问题** - 用户的模式：什么反复阻碍他们
7. **提供下一步行动** - 每次对话结束，用户都知道接下来做什么

## 聊天只是工具

你不是在"聊天"，你是在通过对话完成以上职责。
任何对话中，你都应该在心里问自己：
- 这个信息是否应该进入人生地图？
- 这个信息是否应该进入长期记忆？
- 这个信息是否会影响未来目标？

如果答案是"是"，就主动处理，不要等用户要求。

## 你的说话方式
- 自然、真诚，像一个靠谱的朋友
- 禁止说"作为AI"、"作为一个助手"、"作为你的AI伙伴"
- 禁止用官腔结构
- 直接说重点，别绕弯子
- 偶尔可以开玩笑，但要适度

## 你做事的方式
- 先听对方说，别急着给答案
- 问好问题比给好答案更重要
- 帮对方把模糊的想法变具体
- 如果对方的计划有问题，温和地指出来
- 引用用户之前说过的话、设定过的目标

## 对话中
- 对方完成了事情：真心为他高兴，问问他感受如何
- 对方没完成：不评判，一起看看是忘了、怕了、还是觉得不重要
- 对方卡住了：先理解他的处境，再一起想办法
- 对方情绪低落：先陪他待一会儿，别急着"解决问题"
- 对方分享了新信息：判断这是否重要，是否需要记录

## 回复风格
- 简洁，3-5段就够了
- 适度用emoji，别过度
- 重要的事用**加粗**`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { messages, model, conversationId, systemPrompt, temperature, maxTokens, localEndpointUrl, webSearch, perspectiveContent } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
    }
    if (messages.length > 100) {
      return NextResponse.json({ error: "消息数量超出限制" }, { status: 400 });
    }

    const safeTemperature = typeof temperature === "number" ? Math.max(0, Math.min(2, temperature)) : 0.7;
    const safeMaxTokens = typeof maxTokens === "number" ? Math.max(1, Math.min(128000, Math.floor(maxTokens))) : 4096;

    const modelParts = (model || "openai:gpt-4o-mini").split(":");
    const provider = modelParts[0];
    const modelId = modelParts.slice(1).join(":") || "gpt-4o-mini";
    if (!provider) {
      return NextResponse.json({ error: "模型标识无效" }, { status: 400 });
    }

    let apiKey = "";
    if (provider !== "local") {
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { userId_provider: { userId: session.user.id, provider } },
      });
      if (!apiKeyRecord) {
        return NextResponse.json({ error: `请先在设置中配置 ${provider} 的 API Key` }, { status: 400 });
      }
      try {
        apiKey = decryptApiKey(apiKeyRecord.key);
      } catch {
        return NextResponse.json({ error: "API Key 解密失败，请重新设置" }, { status: 500 });
      }
    }

    let adapter;
    try {
      if (provider === "local") {
        const endpoint = localEndpointUrl || "http://localhost:11434";
        let parsedUrl: URL;
        try { parsedUrl = new URL(endpoint); } catch {
          return NextResponse.json({ error: "本地端点地址无效" }, { status: 400 });
        }
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          return NextResponse.json({ error: "本地端点仅支持 http/https 协议" }, { status: 400 });
        }
        if (!isAllowedEndpoint(endpoint)) {
          return NextResponse.json({ error: "该端点地址不允许访问" }, { status: 403 });
        }
        adapter = new OpenAICompatibleAdapter(endpoint + "/v1/chat/completions");
      } else {
        adapter = getAdapter(provider);
      }
    } catch {
      return NextResponse.json({ error: `不支持的提供商: ${provider}` }, { status: 400 });
    }

    // ===== Build Compass system prompt with memory recall =====
    const chatMessages: ChatMessage[] = [];

    // Load user profile, goals, memories, and today's check-in for context
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const [profile, activeGoals, memories, recentConversations, todayCheckIn, recentBlockers] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
      prisma.goal.findMany({
        where: { userId: session.user.id, status: "active" },
        include: { milestones: true },
        take: 5,
      }),
      prisma.memory.findMany({
        where: { userId: session.user.id },
        orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
        take: 20,
      }),
      prisma.conversation.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { title: true, summary: true },
      }),
      prisma.checkIn.findUnique({
        where: { userId_date: { userId: session.user.id, date: todayMidnight } },
      }),
      prisma.checkIn.findMany({
        where: { userId: session.user.id },
        orderBy: { date: "desc" },
        take: 7,
        select: { blockers: true, completedItems: true, date: true },
      }),
    ]);

    // Build context sections
    let compassContext = COMPASS_COACH_PROMPT + "\n\n";

    if (profile) {
      compassContext += "## 用户档案\n";
      if (profile.bio) compassContext += `- 自我介绍: ${profile.bio}\n`;
      if (profile.lifeStage) compassContext += `- 人生阶段: ${profile.lifeStage}\n`;
      if (profile.currentFocus) compassContext += `- 当前焦点: ${profile.currentFocus}\n`;
      if (profile.coreValues) {
        try { compassContext += `- 核心价值观: ${JSON.parse(profile.coreValues).join(", ")}\n`; } catch {}
      }
      if (profile.strengths) {
        try { compassContext += `- 优势: ${JSON.parse(profile.strengths).join(", ")}\n`; } catch {}
      }
      if (profile.weaknesses) {
        try { compassContext += `- 需改进: ${JSON.parse(profile.weaknesses).join(", ")}\n`; } catch {}
      }
      if (profile.interests) {
        try { compassContext += `- 兴趣: ${JSON.parse(profile.interests).join(", ")}\n`; } catch {}
      }
      compassContext += "\n";
    }

    // User custom AI style
    if (profile?.aiStyle) {
      compassContext += "## 用户自定义对话风格\n" + profile.aiStyle + "\n\n";
    }

    if (activeGoals.length > 0) {
      compassContext += "## 用户当前目标\n";
      for (const goal of activeGoals) {
        const completedMs = goal.milestones.filter((m) => m.status === "completed").length;
        const totalMs = goal.milestones.length;
        compassContext += `- ${goal.title} (${goal.category})`;
        if (totalMs > 0) compassContext += ` [进度: ${completedMs}/${totalMs}]`;
        compassContext += "\n";
      }
      compassContext += "\n";
    }

    if (memories.length > 0) {
      compassContext += "## 关于用户的记忆\n";
      compassContext += "以下是之前对话中提取的关于用户的关键信息，请在对话中自然地引用这些信息：\n";
      for (const mem of memories) {
        compassContext += `- [${mem.category}] ${mem.content}\n`;
      }
      compassContext += "\n";
    }

    if (recentConversations.length > 0) {
      compassContext += "## 最近对话主题\n";
      for (const conv of recentConversations) {
        compassContext += `- ${conv.title}`;
        if (conv.summary) compassContext += `: ${conv.summary}`;
        compassContext += "\n";
      }
      compassContext += "\n";
    }

    // Today's check-in context
    if (todayCheckIn) {
      compassContext += "## 今日签到\n";
      if (todayCheckIn.currentFocus) compassContext += `- 当前阶段: ${todayCheckIn.currentFocus}\n`;
      if (todayCheckIn.destination) compassContext += `- 目标方向: ${todayCheckIn.destination}\n`;
      if (todayCheckIn.todayPlan) compassContext += `- 今日计划: ${todayCheckIn.todayPlan}\n`;
      try {
        const items = JSON.parse(todayCheckIn.completedItems || "[]");
        if (items.length > 0) {
          compassContext += `- 已完成: ${items.map((i: { text: string }) => i.text).join(", ")}\n`;
        }
      } catch {}
      try {
        const blockers = JSON.parse(todayCheckIn.blockers || "[]");
        if (blockers.length > 0) {
          compassContext += `- 遇到阻碍: ${blockers.map((b: { text: string; reason: string }) => `${b.text}(${b.reason})`).join(", ")}\n`;
        }
      } catch {}
      compassContext += "\n";
    }

    // Recent blockers pattern (last 7 days)
    if (recentBlockers.length > 0) {
      const allBlockers: Array<{ reason: string }> = [];
      for (const c of recentBlockers) {
        try {
          const b = JSON.parse(c.blockers || "[]");
          if (Array.isArray(b)) allBlockers.push(...b);
        } catch {}
      }
      if (allBlockers.length >= 3) {
        const reasonCounts: Record<string, number> = {};
        for (const b of allBlockers) {
          if (b.reason) reasonCounts[b.reason] = (reasonCounts[b.reason] || 0) + 1;
        }
        const topReason = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];
        if (topReason && topReason[1] >= 3) {
          const reasonLabels: Record<string, string> = { forgot: "忘了", afraid: "怕了", unimportant: "觉得不重要" };
          compassContext += `## 模式提醒\n用户最近 7 天内有 ${topReason[1]} 次因为「${reasonLabels[topReason[0]] || topReason[0]}」没有完成计划。请在合适的时机温和地提出这个观察，帮助用户思考是否需要调整策略。\n\n`;
        }
      }
    }

    // Prepend perspective if provided
    if (perspectiveContent) {
      compassContext += "\n以下是一个人物的思维框架，请在回答时扮演此角色：\n\n" + perspectiveContent + "\n\n";
    }

    // Web search
    let webSearchContext = "";
    if (webSearch) {
      const lastUserMsg = [...messages].reverse().find((m: ChatMessage) => m.role === "user");
      if (lastUserMsg) {
        try {
          const searchText = typeof lastUserMsg.content === "string"
            ? lastUserMsg.content
            : lastUserMsg.content.filter((p: { type: string }) => p.type === "text").map((p: { text?: string }) => p.text || "").join(" ");
          const searchResults = await webSearchDuckDuckGo(searchText);
          if (searchResults.length > 0) {
            webSearchContext = "\n\n[联网搜索结果]\n" + searchResults
              .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   链接: ${r.url}`)
              .join("\n");
          }
        } catch {}
      }
    }

    // Combine: Coach prompt + user custom prompt + web search
    let finalSystemPrompt = compassContext;
    if (systemPrompt) {
      finalSystemPrompt += "\n## 用户自定义指令\n" + systemPrompt + "\n";
    }
    if (webSearchContext) {
      finalSystemPrompt += webSearchContext + "\n\n请根据以上搜索结果回答用户的问题。";
    }

    chatMessages.push({ role: "system", content: finalSystemPrompt });
    chatMessages.push(...messages);

    // Create or get conversation
    let conversationIdToUse = conversationId;
    if (!conversationIdToUse) {
      const title = generateTitle(messages);
      const conversation = await prisma.conversation.create({
        data: { userId: session.user.id, title, model: `${provider}:${modelId}` },
      });
      conversationIdToUse = conversation.id;
    }

    // Save user message
    const lastMsg = messages[messages.length - 1];
    if (lastMsg) {
      const savedContent = typeof lastMsg.content === "string"
        ? lastMsg.content
        : lastMsg.content.filter((p: { type: string }) => p.type === "text").map((p: { text?: string }) => p.text || "").join("\n");
      await prisma.message.create({
        data: { conversationId: conversationIdToUse, role: lastMsg.role, content: savedContent },
      });
    }

    // Register tools for this user
    registerAllTools(session.user.id);
    const toolDefinitions = getToolDefinitions();

    // SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let totalTokens = 0;
        const fullResponse: string[] = [];
        const allToolCalls: ToolCall[] = [];
        const allToolResults: Array<{ tool_call_id: string; content: string }> = [];

        try {
          // Agent execution loop - may run multiple iterations if tool calls occur
          let currentMessages = [...chatMessages];
          let iteration = 0;
          const MAX_ITERATIONS = 5; // Safety limit

          while (iteration < MAX_ITERATIONS) {
            iteration++;
            const iterToolCalls: ToolCall[] = [];
            const iterTextChunks: string[] = [];

            for await (const chunk of adapter.stream(currentMessages, apiKey, {
              model: modelId,
              temperature: safeTemperature,
              maxTokens: safeMaxTokens,
              tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
              tool_choice: toolDefinitions.length > 0 ? "auto" : undefined,
            })) {
              if (typeof chunk === "string") {
                // Text content
                totalTokens += chunk.length;
                iterTextChunks.push(chunk);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`));
              } else {
                // Tool call
                iterToolCalls.push(chunk);
              }
            }

            // If no tool calls, we're done
            if (iterToolCalls.length === 0) {
              fullResponse.push(...iterTextChunks);
              break;
            }

            // Process tool calls
            fullResponse.push(...iterTextChunks);
            allToolCalls.push(...iterToolCalls);

            // Build assistant message with tool calls
            const assistantContent = iterTextChunks.join("") || undefined;
            const assistantMsg: ChatMessage = {
              role: "assistant",
              content: assistantContent || "",
              tool_calls: iterToolCalls,
            };
            currentMessages.push(assistantMsg);

            // Send tool calls to client
            for (const tc of iterToolCalls) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_call", tool_call: tc })}\n\n`));
            }

            // Execute each tool and build results
            for (const tc of iterToolCalls) {
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(tc.function.arguments);
              } catch {
                // Invalid JSON arguments
              }

              const result = await executeTool(tc.function.name, args);
              allToolResults.push({ tool_call_id: tc.id, content: result });

              // Send tool result to client
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "tool_result", tool_call_id: tc.id, content: result })}\n\n`));

              // Add tool result message
              currentMessages.push({
                role: "tool",
                content: result,
                tool_call_id: tc.id,
              });
            }
          }

          const responseContent = fullResponse.join("");

          // Save assistant message
          await prisma.message.create({
            data: { conversationId: conversationIdToUse, role: "assistant", content: responseContent, tokens: totalTokens },
          });

          // Update title if default
          const conv = await prisma.conversation.findUnique({ where: { id: conversationIdToUse } });
          if (conv && conv.title === "新对话") {
            const newTitle = generateTitle([...messages, { role: "assistant", content: responseContent }]);
            await prisma.conversation.update({ where: { id: conversationIdToUse }, data: { title: newTitle } });
          }

          // ===== Background: Memory extraction + Summary + Tags =====
          // These run after streaming to not block the response
          const userId = session.user.id;
          const conversationId = conversationIdToUse;
          const allMessages = [...messages, { role: "assistant", content: responseContent }];

          // Fire and forget - don't await
          extractMemoriesAndSummary(userId, conversationId, allMessages).catch(() => {});

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done", tokens: totalTokens, conversationId: conversationIdToUse, tool_calls: allToolCalls.length > 0 ? allToolCalls : undefined })}\n\n`));
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "未知错误";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" },
    });
  } catch {
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// ===== Background: Extract memories and generate summary =====
async function extractMemoriesAndSummary(userId: string, conversationId: string, messages: ChatMessage[]) {
  try {
    // Build conversation text for analysis
    const conversationText = messages
      .map((m) => `${m.role === "user" ? "用户" : "AI"}: ${typeof m.content === "string" ? m.content : m.content.filter((p) => p.type === "text").map((p) => p.text || "").join(" ")}`)
      .join("\n");

    // Use a simple keyword extraction approach (no extra LLM call needed)
    // In production, you'd call an LLM here. For now, we do pattern-based extraction.
    const extractedMemories: Array<{ category: string; content: string; importance: number }> = [];

    // Extract goals mentioned
    const goalPatterns = [
      /(?:我想|我要|我打算|我计划|我目标是|我希望)(.{5,50})[。，]/g,
      /(?:目标|计划|打算|想要)(.{5,50})[。，]/g,
    ];
    for (const pattern of goalPatterns) {
      let match;
      while ((match = pattern.exec(conversationText)) !== null) {
        extractedMemories.push({ category: "goal", content: `用户提到: ${match[0].trim()}`, importance: 7 });
      }
    }

    // Extract preferences
    const prefPatterns = [
      /(?:我喜欢|我偏好|我习惯|我更喜欢|我倾向于)(.{5,50})[。，]/g,
      /(?:不喜欢|讨厌|不想|拒绝)(.{5,50})[。，]/g,
    ];
    for (const pattern of prefPatterns) {
      let match;
      while ((match = pattern.exec(conversationText)) !== null) {
        extractedMemories.push({ category: "preference", content: `用户偏好: ${match[0].trim()}`, importance: 5 });
      }
    }

    // Extract emotions
    const emotionPatterns = [
      /(?:我感到|我觉得|我很|我有点|我非常)(焦虑|迷茫|兴奋|开心|难过|压力|困惑|不安|自信|无力)(.{0,30})[。，]/g,
    ];
    for (const pattern of emotionPatterns) {
      let match;
      while ((match = pattern.exec(conversationText)) !== null) {
        extractedMemories.push({ category: "emotion", content: `用户情绪: ${match[0].trim()}`, importance: 6 });
      }
    }

    // Extract decisions
    const decisionPatterns = [
      /(?:我决定|我选择了|我确定了|我决定了)(.{5,50})[。，]/g,
    ];
    for (const pattern of decisionPatterns) {
      let match;
      while ((match = pattern.exec(conversationText)) !== null) {
        extractedMemories.push({ category: "decision", content: `用户决策: ${match[0].trim()}`, importance: 8 });
      }
    }

    // Extract facts (name, job, location etc.)
    const factPatterns = [
      /(?:我是|我的名字是|我叫)(.{2,20})[。，]/g,
      /(?:我在|我住|我位于)(.{2,20})(?:工作|生活|学习)/g,
      /(?:我是|我的职业是|我的工作是)(.{2,20})[。，]/g,
    ];
    for (const pattern of factPatterns) {
      let match;
      while ((match = pattern.exec(conversationText)) !== null) {
        extractedMemories.push({ category: "fact", content: `用户信息: ${match[0].trim()}`, importance: 6 });
      }
    }

    // Save extracted memories (deduplicate by checking similar content)
    for (const mem of extractedMemories) {
      const existing = await prisma.memory.findFirst({
        where: { userId, content: mem.content },
      });
      if (!existing) {
        await prisma.memory.create({
          data: { userId, category: mem.category, content: mem.content, importance: mem.importance, source: conversationId },
        });
      }
    }

    // Generate summary and tags for the conversation
    const userMessages = messages.filter((m) => m.role === "user");
    const firstMsg = typeof userMessages[0]?.content === "string"
      ? userMessages[0].content
      : Array.isArray(userMessages[0]?.content)
        ? userMessages[0].content.filter((p) => p.type === "text").map((p) => p.text || "").join(" ")
        : "";

    // Simple tag extraction
    const tags: string[] = [];
    if (/目标|计划|打算|想要/.test(firstMsg)) tags.push("目标");
    if (/决策|选择|决定|该不该|要不要/.test(firstMsg)) tags.push("决策");
    if (/复盘|回顾|总结|反思/.test(firstMsg)) tags.push("复盘");
    if (/焦虑|迷茫|压力|难过|不安/.test(firstMsg)) tags.push("情绪");
    if (/学习|提升|成长|进步/.test(firstMsg)) tags.push("成长");
    if (/职业|工作|跳槽|转行/.test(firstMsg)) tags.push("职业");
    if (tags.length === 0) tags.push("闲聊");

    const summary = firstMsg.slice(0, 50) + (firstMsg.length > 50 ? "..." : "");

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { summary, tags: JSON.stringify(tags) },
    });

    // ===== Skill tag extraction =====
    const skillKeywords: Record<string, string[]> = {
      "产品思维": ["产品", "需求", "用户", "功能", "体验", "交互", "设计"],
      "决策力": ["决策", "选择", "权衡", "判断", "分析"],
      "沟通力": ["沟通", "表达", "说服", "谈判", "协调"],
      "学习力": ["学习", "提升", "进步", "成长", "掌握"],
      "执行力": ["执行", "行动", "落地", "完成", "交付"],
      "情绪管理": ["情绪", "焦虑", "压力", "心态", "调节"],
      "战略思维": ["战略", "规划", "方向", "布局", "长期"],
      "创造力": ["创新", "创意", "灵感", "想法", "构思"],
      "领导力": ["领导", "管理", "团队", "带人", "协调"],
      "财务思维": ["财务", "投资", "理财", "收入", "成本"],
    };

    const allText = conversationText.toLowerCase();
    for (const [skillName, keywords] of Object.entries(skillKeywords)) {
      const matchCount = keywords.filter((kw) => allText.includes(kw)).length;
      if (matchCount >= 2) {
        // Conversation demonstrated this skill
        const existing = await prisma.skillTag.findUnique({
          where: { userId_name: { userId, name: skillName } },
        });

        if (existing) {
          // Level up slightly if demonstrated well
          const newLevel = Math.min(10, existing.level + (matchCount >= 3 ? 1 : 0));
          await prisma.skillTag.update({
            where: { id: existing.id },
            data: { level: newLevel, lastAssessedAt: new Date() },
          });
        } else {
          await prisma.skillTag.create({
            data: {
              userId,
              name: skillName,
              level: Math.min(3, matchCount),
              evidence: JSON.stringify([`在对话"${messages[0]?.content?.toString().slice(0, 20) || ""}"中展现`]),
              lastAssessedAt: new Date(),
            },
          });
        }
      }
    }
  } catch {
    // Silently ignore extraction failures - don't break the chat
  }
}

function generateTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === "user");
  const content = firstUserMsg?.content || messages[0]?.content || "新对话";
  const text = typeof content === "string" ? content : content.filter((p) => p.type === "text").map((p) => p.text || "").join(" ");
  return text.replace(/[\n\r]/g, " ").slice(0, 30) + (text.length > 30 ? "..." : "");
}

async function webSearchDuckDuckGo(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; AIChatBot/1.0)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return [];
  const html = await response.text();
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const resultRegex = /<a[^>]+class="result-link"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
  const links: string[] = [], titles: string[] = [], snippets: string[] = [];
  let match;
  while ((match = resultRegex.exec(html)) !== null) {
    links.push(match[1]);
    titles.push(match[2].replace(/<[^>]+>/g, "").trim());
  }
  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
  }
  for (let i = 0; i < Math.min(links.length, 8); i++) {
    if (!links[i] || links[i].startsWith("/")) continue;
    results.push({ title: titles[i] || "", url: links[i], snippet: snippets[i] || "" });
  }
  return results;
}
