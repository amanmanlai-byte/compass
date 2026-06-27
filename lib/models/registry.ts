import type { ChatMessage, ModelInfo, ModelAdapter, ContentPart, ToolDefinition, ToolCall } from "@/lib/types";

// ===== Provider Model Lists =====

const OPENAI_MODELS: ModelInfo[] = [
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", supportsVision: true, supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 128000 },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", supportsVision: true, supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 128000 },
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", provider: "openai", supportsVision: true, supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 128000 },
  { id: "gpt-4", name: "GPT-4", provider: "openai", supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 8192 },
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", supportsStreaming: true, supportsFunctionCalling: true, maxTokens: 16385 },
  { id: "o1-preview", name: "o1 Preview", provider: "openai", supportsStreaming: true, maxTokens: 128000 },
  { id: "o1-mini", name: "o1 Mini", provider: "openai", supportsStreaming: true, maxTokens: 128000 },
  { id: "o3-mini", name: "o3 Mini", provider: "openai", supportsStreaming: true, maxTokens: 128000 },
];

const ANTHROPIC_MODELS: ModelInfo[] = [
  { id: "claude-opus-4-5", name: "Claude Opus 4.5", provider: "anthropic", supportsVision: true, supportsStreaming: true, maxTokens: 200000 },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "anthropic", supportsVision: true, supportsStreaming: true, maxTokens: 200000 },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", provider: "anthropic", supportsVision: true, supportsStreaming: true, maxTokens: 200000 },
  { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "anthropic", supportsVision: true, supportsStreaming: true, maxTokens: 200000 },
  { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", provider: "anthropic", supportsVision: true, supportsStreaming: true, maxTokens: 200000 },
  { id: "claude-3-opus-20240229", name: "Claude 3 Opus", provider: "anthropic", supportsVision: true, supportsStreaming: true, maxTokens: 200000 },
];

const GOOGLE_MODELS: ModelInfo[] = [
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", supportsVision: true, supportsStreaming: true, maxTokens: 1048576 },
  { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", provider: "google", supportsVision: true, supportsStreaming: true, maxTokens: 1048576 },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "google", supportsVision: true, supportsStreaming: true, maxTokens: 1048576 },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "google", supportsVision: true, supportsStreaming: true, maxTokens: 1048576 },
  { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B", provider: "google", supportsVision: true, supportsStreaming: true, maxTokens: 1048576 },
];

const DEEPSEEK_MODELS: ModelInfo[] = [
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "deepseek", supportsStreaming: true, maxTokens: 1048576, description: "支持思考模式，1M 上下文" },
  { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", provider: "deepseek", supportsStreaming: true, maxTokens: 1048576, description: "高性能版，支持思考模式，1M 上下文" },
  { id: "deepseek-chat", name: "DeepSeek Chat (旧版)", provider: "deepseek", supportsStreaming: true, maxTokens: 65536 },
  { id: "deepseek-reasoner", name: "DeepSeek Reasoner (旧版)", provider: "deepseek", supportsStreaming: true, maxTokens: 65536 },
];

const MISTRAL_MODELS: ModelInfo[] = [
  { id: "mistral-large-latest", name: "Mistral Large", provider: "mistral", supportsStreaming: true, maxTokens: 128000 },
  { id: "mistral-medium", name: "Mistral Medium", provider: "mistral", supportsStreaming: true, maxTokens: 32000 },
  { id: "mistral-small", name: "Mistral Small", provider: "mistral", supportsStreaming: true, maxTokens: 32000 },
  { id: "open-mixtral-8x22b", name: "Mixtral 8x22B", provider: "mistral", supportsStreaming: true, maxTokens: 65536 },
  { id: "codestral-latest", name: "Codestral", provider: "mistral", supportsStreaming: true, maxTokens: 32000 },
];

const GROQ_MODELS: ModelInfo[] = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "groq", supportsStreaming: true, maxTokens: 128000 },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", provider: "groq", supportsStreaming: true, maxTokens: 131072 },
  { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B", provider: "groq", supportsStreaming: true, maxTokens: 131072 },
  { id: "llama3-groq-70b-8192-tool-use-preview", name: "Llama 3 Groq 70B Tool Use", provider: "groq", supportsStreaming: true, maxTokens: 8192 },
];

const XAI_MODELS: ModelInfo[] = [
  { id: "grok-2", name: "Grok 2", provider: "xai", supportsVision: true, supportsStreaming: true, maxTokens: 131072 },
  { id: "grok-2-mini", name: "Grok 2 Mini", provider: "xai", supportsStreaming: true, maxTokens: 131072 },
  { id: "grok-beta", name: "Grok Beta", provider: "xai", supportsStreaming: true, maxTokens: 131072 },
];

const MOONSHOT_MODELS: ModelInfo[] = [
  { id: "moonshot-v1-8k", name: "Moonshot v1 8K", provider: "moonshot", supportsStreaming: true, maxTokens: 8192 },
  { id: "moonshot-v1-32k", name: "Moonshot v1 32K", provider: "moonshot", supportsStreaming: true, maxTokens: 32768 },
  { id: "moonshot-v1-128k", name: "Moonshot v1 128K", provider: "moonshot", supportsStreaming: true, maxTokens: 128000 },
];

const QWEN_MODELS: ModelInfo[] = [
  { id: "qwen-max", name: "Qwen Max", provider: "qwen", supportsStreaming: true, maxTokens: 32768 },
  { id: "qwen-plus", name: "Qwen Plus", provider: "qwen", supportsStreaming: true, maxTokens: 131072 },
  { id: "qwen-turbo", name: "Qwen Turbo", provider: "qwen", supportsStreaming: true, maxTokens: 131072 },
  { id: "qwen-long", name: "Qwen Long", provider: "qwen", supportsStreaming: true, maxTokens: 10000000 },
];

const BAICHUAN_MODELS: ModelInfo[] = [
  { id: "baichuan4", name: "Baichuan 4", provider: "baichuan", supportsStreaming: true, maxTokens: 32768 },
  { id: "baichuan3-turbo", name: "Baichuan 3 Turbo", provider: "baichuan", supportsStreaming: true, maxTokens: 32768 },
];

const YI_MODELS: ModelInfo[] = [
  { id: "yi-large", name: "Yi Large", provider: "yi", supportsStreaming: true, maxTokens: 32768 },
  { id: "yi-medium", name: "Yi Medium", provider: "yi", supportsStreaming: true, maxTokens: 16384 },
  { id: "yi-lightning", name: "Yi Lightning", provider: "yi", supportsStreaming: true, maxTokens: 16384 },
];

const GLM_MODELS: ModelInfo[] = [
  { id: "glm-4", name: "GLM-4", provider: "glm", supportsStreaming: true, maxTokens: 128000 },
  { id: "glm-4-flash", name: "GLM-4 Flash", provider: "glm", supportsStreaming: true, maxTokens: 128000 },
  { id: "glm-4v", name: "GLM-4V (Vision)", provider: "glm", supportsVision: true, supportsStreaming: true, maxTokens: 128000 },
];

const COHERE_MODELS: ModelInfo[] = [
  { id: "command-r-plus", name: "Command R+", provider: "cohere", supportsStreaming: true, maxTokens: 128000 },
  { id: "command-r", name: "Command R", provider: "cohere", supportsStreaming: true, maxTokens: 128000 },
  { id: "command", name: "Command", provider: "cohere", supportsStreaming: true, maxTokens: 4096 },
];

const PERPLEXITY_MODELS: ModelInfo[] = [
  { id: "llama-3.1-sonar-large-128k-online", name: "Sonar Large 128K Online", provider: "perplexity", supportsStreaming: true, maxTokens: 131072 },
];

const LOCAL_MODELS: ModelInfo[] = [
  { id: "ollama", name: "Ollama (自动检测)", provider: "local", supportsStreaming: true, maxTokens: 128000, description: "自动连接本机 Ollama 服务，需先安装 Ollama" },
  { id: "qwen3.6:latest", name: "Qwen 3.6 (36B)", provider: "local", supportsStreaming: true, maxTokens: 262144, supportsVision: true },
  { id: "gemma4:latest", name: "Gemma 4 (8B)", provider: "local", supportsStreaming: true, maxTokens: 131072 },
  { id: "llama3.2", name: "Llama 3.2", provider: "local", supportsStreaming: true, maxTokens: 128000 },
  { id: "llama3.1", name: "Llama 3.1", provider: "local", supportsStreaming: true, maxTokens: 131072 },
  { id: "qwen2.5", name: "Qwen 2.5", provider: "local", supportsStreaming: true, maxTokens: 32768 },
  { id: "deepseek-r1", name: "DeepSeek R1 (本地)", provider: "local", supportsStreaming: true, maxTokens: 65536 },
  { id: "mistral", name: "Mistral (本地)", provider: "local", supportsStreaming: true, maxTokens: 32768 },
  { id: "phi4", name: "Phi-4", provider: "local", supportsStreaming: true, maxTokens: 16384 },
  { id: "gemma2", name: "Gemma 2", provider: "local", supportsStreaming: true, maxTokens: 8192 },
  { id: "custom", name: "自定义模型", provider: "local", supportsStreaming: true, maxTokens: 128000, description: "使用自定义 endpoint URL 的任意模型" },
];

const TOGETHER_MODELS: ModelInfo[] = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "together", supportsStreaming: true, maxTokens: 131072 },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B", provider: "together", supportsStreaming: true, maxTokens: 131072 },
  { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B", provider: "together", supportsStreaming: true, maxTokens: 131072 },
];

// ===== Provider API Endpoints =====

const API_ENDPOINTS: Record<string, string> = {
  openai: "https://api.openai.com/v1/chat/completions",
  anthropic: "https://api.anthropic.com/v1/messages",
  google: "https://generativelanguage.googleapis.com/v1beta/models",
  deepseek: "https://api.deepseek.com/v1/chat/completions",
  mistral: "https://api.mistral.ai/v1/chat/completions",
  groq: "https://api.groq.com/openai/v1/chat/completions",
  xai: "https://api.x.ai/v1/chat/completions",
  moonshot: "https://api.moonshot.cn/v1/chat/completions",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  baichuan: "https://api.baichuan-ai.com/v1/chat/completions",
  yi: "https://api.lingyiwanwu.com/v1/chat/completions",
  glm: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  cohere: "https://api.cohere.com/v2/chat",
  perplexity: "https://api.perplexity.ai/chat/completions",
  together: "https://api.together.xyz/v1/chat/completions",
  local: "http://localhost:11434/v1/chat/completions",  // Ollama 默认地址
};

// ===== Sleep utility for retry =====

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ===== Multimodal helpers =====

function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64Data: match[2] };
}

function getTextContent(content: string | ContentPart[]): string {
  if (typeof content === "string") return content;
  return content
    .filter((p): p is ContentPart & { type: "text"; text: string } => p.type === "text" && !!p.text)
    .map((p) => p.text)
    .join("\n");
}

function toGoogleParts(content: string | ContentPart[]): Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> {
  if (typeof content === "string") return [{ text: content }];
  return content.map((p) => {
    if (p.type === "image_url" && p.image_url?.url) {
      const parsed = parseDataUrl(p.image_url.url);
      if (parsed) {
        return { inlineData: { mimeType: parsed.mimeType, data: parsed.base64Data } };
      }
      return { text: "[图片无法解析]" };
    }
    return { text: p.text || "" };
  });
}

function toAnthropicContent(content: string | ContentPart[]): string | Array<{ type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: string; data: string } }> {
  if (typeof content === "string") return content;
  return content.map((p) => {
    if (p.type === "image_url" && p.image_url?.url) {
      const parsed = parseDataUrl(p.image_url.url);
      if (parsed) {
        return { type: "image" as const, source: { type: "base64" as const, media_type: parsed.mimeType, data: parsed.base64Data } };
      }
      return { type: "text" as const, text: "[图片无法解析]" };
    }
    return { type: "text" as const, text: p.text || "" };
  });
}

// ===== Proxy support for China users =====
let HttpsProxyAgentClass: any = null;
try {
  const mod = require("https-proxy-agent");
  HttpsProxyAgentClass = mod.HttpsProxyAgent;
} catch {
  // Proxy agent not available
}

function getFetchAgent(url: string) {
  try {
    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "";
    if (!proxyUrl || !HttpsProxyAgentClass) return undefined;
    if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) return undefined;
    return new HttpsProxyAgentClass(proxyUrl);
  } catch {
    return undefined;
  }
}

// ===== Provider Adapter Implementations =====

// OpenAI-compatible adapter (works for: openai, deepseek, mistral, groq, xai, moonshot, qwen, baichuan, yi, together, perplexity, local)
export class OpenAICompatibleAdapter implements ModelAdapter {
  private baseUrl: string;
  private apiKeyHeader: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    if (baseUrl.includes("anthropic")) {
      this.apiKeyHeader = "x-api-key";
    } else {
      this.apiKeyHeader = "Authorization";
    }
  }

  async *stream(
    messages: ChatMessage[],
    apiKey: string,
    options: { model?: string; temperature?: number; maxTokens?: number; frequencyPenalty?: number; presencePenalty?: number; topP?: number; tools?: ToolDefinition[]; tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } } } = {}
  ): AsyncGenerator<string | ToolCall, void, unknown> {
    const body: Record<string, unknown> = {
      model: options.model || "",
      messages: messages.map((m) => {
        const content = m.content;
        if (typeof content === "string") {
          return { role: m.role, content };
        }
        if (Array.isArray(content)) {
          const parts = content.map((p) => {
            if (p.type === "image_url" && p.image_url) {
              return { type: "image_url", image_url: { url: p.image_url.url } };
            }
            return { type: "text", text: p.text || "" };
          });
          return { role: m.role, content: parts };
        }
        return { role: m.role, content: String(content) };
      }),
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.frequencyPenalty !== undefined) body.frequency_penalty = options.frequencyPenalty;
    if (options.presencePenalty !== undefined) body.presence_penalty = options.presencePenalty;
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.tools && options.tools.length > 0) body.tools = options.tools;
    if (options.tool_choice !== undefined) body.tool_choice = options.tool_choice;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (this.baseUrl.includes("anthropic")) {
          headers["x-api-key"] = apiKey;
          headers["anthropic-version"] = "2023-06-01";
        } else {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }

        const agent = getFetchAgent(this.baseUrl);
        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          ...(agent ? { agent } : {}),
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage: string;

          if (response.status === 401) errorMessage = "API Key 无效，请检查设置中的 API Key";
          else if (response.status === 429) errorMessage = "请求过于频繁，请稍后再试";
          else if (response.status === 402 || errorText.includes("insufficient_quota")) errorMessage = "API 余额不足，请充值后继续";
          else errorMessage = `API 错误 (${response.status}): ${errorText.slice(0, 200)}`;

          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("无法读取响应流");

        const decoder = new TextDecoder();
        let buffer = "";

        // Track tool call deltas
        const toolCallBuffers: Map<number, { id: string; name: string; arguments: string }> = new Map();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") return;

            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;
              if (!delta) continue;

              // Handle text content
              const content = delta.content;
              if (content) yield content;

              // Handle tool calls
              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const index = tc.index ?? 0;
                  if (!toolCallBuffers.has(index)) {
                    toolCallBuffers.set(index, { id: "", name: "", arguments: "" });
                  }
                  const buffer = toolCallBuffers.get(index)!;
                  if (tc.id) buffer.id = tc.id;
                  if (tc.function?.name) buffer.name = tc.function.name;
                  if (tc.function?.arguments) buffer.arguments += tc.function.arguments;
                }
              }

              // Check if this is the finish reason for tool calls
              if (choice.finish_reason === "tool_calls") {
                // Yield all completed tool calls
                for (const [, tc] of toolCallBuffers) {
                  if (tc.id && tc.name) {
                    yield {
                      id: tc.id,
                      type: "function",
                      function: {
                        name: tc.name,
                        arguments: tc.arguments,
                      },
                    };
                  }
                }
                return;
              }
            } catch {
              // Skip malformed JSON chunks
            }
          }
        }
        return; // Success - exit function
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < 2) {
          await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }

    throw lastError || new Error("请求失败");
  }
}

// Google Gemini adapter (different API format)
class GoogleAdapter implements ModelAdapter {
  async *stream(
    messages: ChatMessage[],
    apiKey: string,
    options: { model?: string; temperature?: number; maxTokens?: number; tools?: ToolDefinition[] } = {}
  ): AsyncGenerator<string | ToolCall, void, unknown> {
    const modelId = options.model || "gemini-2.0-flash";
    const url = `${API_ENDPOINTS.google}/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : m.role,
      parts: toGoogleParts(m.content),
    }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    };

    if (options.tools && options.tools.length > 0) {
      // Convert to Gemini function declarations format
      body.tools = [{
        function_declarations: options.tools.map((t) => ({
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        })),
      }];
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const agent = getFetchAgent(url);
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 403 || response.status === 401) throw new Error("API Key 无效或权限不足");
          throw new Error(`Gemini API 错误: ${errorText.slice(0, 200)}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("无法读取响应流");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const candidate = parsed.candidates?.[0];
              if (!candidate?.content?.parts) continue;

              for (const part of candidate.content.parts) {
                // Handle text
                if (part.text) yield part.text;

                // Handle function calls
                if (part.functionCall) {
                  yield {
                    id: `gemini-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    type: "function",
                    function: {
                      name: part.functionCall.name,
                      arguments: JSON.stringify(part.functionCall.args || {}),
                    },
                  };
                }
              }
            } catch {
              // Skip
            }
          }
        }
        return;
      } catch (error) {
        if (attempt < 2) await sleep(Math.pow(2, attempt) * 1000);
        if (attempt === 2) throw error;
      }
    }
  }
}

// Anthropic-specific adapter (different API format)
class AnthropicAdapter implements ModelAdapter {
  async *stream(
    messages: ChatMessage[],
    apiKey: string,
    options: { model?: string; temperature?: number; maxTokens?: number; tools?: ToolDefinition[] } = {}
  ): AsyncGenerator<string | ToolCall, void, unknown> {
    const modelId = options.model || "";
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const body: Record<string, unknown> = {
      model: modelId || "claude-sonnet-4-5",
      messages: chatMessages.map((m) => ({ role: m.role, content: toAnthropicContent(m.content) })),
      system: systemMsg ? getTextContent(systemMsg.content) : undefined,
      stream: true,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
    };

    if (options.tools && options.tools.length > 0) {
      // Convert OpenAI tool format to Anthropic format
      body.tools = options.tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const agent = getFetchAgent(API_ENDPOINTS.anthropic);
        const response = await fetch(API_ENDPOINTS.anthropic, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (response.status === 401) throw new Error("API Key 无效");
          throw new Error(`Anthropic API 错误: ${errorText.slice(0, 200)}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("无法读取响应流");

        const decoder = new TextDecoder();
        let buffer = "";

        // Track tool use blocks
        let currentToolId = "";
        let currentToolName = "";
        let currentToolInput = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            try {
              const parsed = JSON.parse(trimmed.slice(6));

              // Handle text content
              if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                yield parsed.delta.text;
              }

              // Handle tool use start
              if (parsed.type === "content_block_start" && parsed.content_block?.type === "tool_use") {
                currentToolId = parsed.content_block.id;
                currentToolName = parsed.content_block.name;
                currentToolInput = "";
              }

              // Handle tool input delta
              if (parsed.type === "content_block_delta" && parsed.delta?.type === "input_json_delta") {
                currentToolInput += parsed.delta.partial_json;
              }

              // Handle tool use end
              if (parsed.type === "content_block_stop" && currentToolId) {
                if (currentToolName) {
                  yield {
                    id: currentToolId,
                    type: "function",
                    function: {
                      name: currentToolName,
                      arguments: currentToolInput,
                    },
                  };
                }
                currentToolId = "";
                currentToolName = "";
                currentToolInput = "";
              }
            } catch {
              // Skip
            }
          }
        }
        return;
      } catch (error) {
        if (attempt < 2) await sleep(Math.pow(2, attempt) * 1000);
        if (attempt === 2) throw error;
      }
    }
  }
}

// ===== Cohere adapter (different API format) =====
class CohereAdapter implements ModelAdapter {
  async *stream(
    messages: ChatMessage[],
    apiKey: string,
    options: { model?: string; temperature?: number; maxTokens?: number; tools?: ToolDefinition[] } = {}
  ): AsyncGenerator<string | ToolCall, void, unknown> {
    const chatHistory = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      message: getTextContent(m.content),
    }));
    const lastMessage = messages[messages.length - 1];

    const body: Record<string, unknown> = {
      model: options.model || "command-r-plus",
      message: lastMessage ? getTextContent(lastMessage.content) : "",
      chat_history: chatHistory,
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.tools && options.tools.length > 0) {
      body.tools = options.tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameter_definitions: t.function.parameters.properties,
      }));
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const agent = getFetchAgent(API_ENDPOINTS.cohere);
        const response = await fetch(API_ENDPOINTS.cohere, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error(`Cohere API 错误: ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("无法读取响应流");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              if (parsed.event_type === "text-generation" && parsed.text) {
                yield parsed.text;
              }
              // Handle tool calls
              if (parsed.event_type === "tool-call") {
                yield {
                  id: `cohere-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  type: "function",
                  function: {
                    name: parsed.tool?.name || "",
                    arguments: JSON.stringify(parsed.tool?.parameters || {}),
                  },
                };
              }
            } catch {
              // Skip
            }
          }
        }
        return;
      } catch (error) {
        if (attempt < 2) await sleep(Math.pow(2, attempt) * 1000);
        if (attempt === 2) throw error;
      }
    }
  }
}

// ===== GLM Adapter (Zhipu AI - different auth) =====
class GLMAdapter implements ModelAdapter {
  async *stream(
    messages: ChatMessage[],
    apiKey: string,
    options: { model?: string; temperature?: number; maxTokens?: number; tools?: ToolDefinition[] } = {}
  ): AsyncGenerator<string | ToolCall, void, unknown> {
    const body: Record<string, unknown> = {
      model: options.model || "glm-4-flash",
      messages: messages.map((m) => {
        const content = m.content;
        if (typeof content === "string") {
          return { role: m.role, content };
        }
        if (Array.isArray(content)) {
          const parts = content.map((p) => {
            if (p.type === "image_url" && p.image_url) {
              return { type: "image_url", image_url: { url: p.image_url.url } };
            }
            return { type: "text", text: p.text || "" };
          });
          return { role: m.role, content: parts };
        }
        return { role: m.role, content: String(content) };
      }),
      stream: true,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.tools && options.tools.length > 0) body.tools = options.tools;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const agent = getFetchAgent(API_ENDPOINTS.glm);
        const response = await fetch(API_ENDPOINTS.glm, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) throw new Error(`GLM API 错误: ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("无法读取响应流");

        const decoder = new TextDecoder();
        let buffer = "";

        // Track tool call deltas
        const toolCallBuffers: Map<number, { id: string; name: string; arguments: string }> = new Map();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            if (trimmed.includes("[DONE]")) return;
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              const choice = parsed.choices?.[0];
              if (!choice) continue;

              const delta = choice.delta;
              if (!delta) continue;

              // Handle text content
              const content = delta.content;
              if (content) yield content;

              // Handle tool calls
              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const index = tc.index ?? 0;
                  if (!toolCallBuffers.has(index)) {
                    toolCallBuffers.set(index, { id: "", name: "", arguments: "" });
                  }
                  const buffer = toolCallBuffers.get(index)!;
                  if (tc.id) buffer.id = tc.id;
                  if (tc.function?.name) buffer.name = tc.function.name;
                  if (tc.function?.arguments) buffer.arguments += tc.function.arguments;
                }
              }

              // Check if this is the finish reason for tool calls
              if (choice.finish_reason === "tool_calls") {
                for (const [, tc] of toolCallBuffers) {
                  if (tc.id && tc.name) {
                    yield {
                      id: tc.id,
                      type: "function",
                      function: {
                        name: tc.name,
                        arguments: tc.arguments,
                      },
                    };
                  }
                }
                return;
              }
            } catch {
              // Skip
            }
          }
        }
        return;
      } catch (error) {
        if (attempt < 2) await sleep(Math.pow(2, attempt) * 1000);
        if (attempt === 2) throw error;
      }
    }
  }
}

// ===== Model Adapter Registry =====

export const ALL_MODELS: ModelInfo[] = [
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...GOOGLE_MODELS,
  ...DEEPSEEK_MODELS,
  ...MISTRAL_MODELS,
  ...GROQ_MODELS,
  ...XAI_MODELS,
  ...MOONSHOT_MODELS,
  ...QWEN_MODELS,
  ...BAICHUAN_MODELS,
  ...YI_MODELS,
  ...GLM_MODELS,
  ...COHERE_MODELS,
  ...PERPLEXITY_MODELS,
  ...TOGETHER_MODELS,
  ...LOCAL_MODELS,
];

export function getModelsByProvider(): Record<string, ModelInfo[]> {
  const grouped: Record<string, ModelInfo[]> = {};
  for (const model of ALL_MODELS) {
    if (!grouped[model.provider]) grouped[model.provider] = [];
    grouped[model.provider].push(model);
  }
  return grouped;
}

export function getModelById(id: string): ModelInfo | undefined {
  return ALL_MODELS.find((m) => m.id === id);
}

export function getProviderForModel(modelId: string): string | null {
  const model = getModelById(modelId);
  return model?.provider || null;
}

export function getAdapter(provider: string): ModelAdapter {
  switch (provider) {
    case "anthropic":
      return new AnthropicAdapter();
    case "google":
      return new GoogleAdapter();
    case "cohere":
      return new CohereAdapter();
    case "glm":
      return new GLMAdapter();
    case "openai":
      return new OpenAICompatibleAdapter(API_ENDPOINTS.openai);
    case "deepseek":
      return new OpenAICompatibleAdapter(API_ENDPOINTS.deepseek);
    case "mistral":
      return new OpenAICompatibleAdapter(API_ENDPOINTS.mistral);
    case "groq":
      return new OpenAICompatibleAdapter(API_ENDPOINTS.groq);
    case "xai":
      return new OpenAICompatibleAdapter(API_ENDPOINTS.xai);
    case "moonshot":
      return new OpenAICompatibleAdapter(API_ENDPOINTS.moonshot);
    case "qwen":
      return new OpenAICompatibleAdapter(API_ENDPOINTS.qwen);
    case "baichuan":
      return new OpenAICompatibleAdapter(API_ENDPOINTS.baichuan);
    case "yi":
      return new OpenAICompatibleAdapter(API_ENDPOINTS.yi);
    case "perplexity":
      return new OpenAICompatibleAdapter(API_ENDPOINTS.perplexity);
    case "together":
      return new OpenAICompatibleAdapter(API_ENDPOINTS.together);
    case "local":
      return new OpenAICompatibleAdapter(API_ENDPOINTS.local);
    default:
      throw new Error(`不支持的 AI 提供商: ${provider}`);
  }
}
