import type { User } from "next-auth";

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string | ContentPart[];
  images?: Array<{ data: string; mimeType: string }>;
  tokens?: number;
  createdAt?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

// ===== Tool / Function Calling Types =====

export interface ToolParameterProperty {
  type: string;
  description?: string;
  enum?: string[];
}

export interface ToolParameters {
  type: "object";
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: ToolParameters;
  };
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<string>;

export interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

// ===== Agent Types =====

export interface AgentStep {
  type: "text" | "tool_call" | "tool_result";
  text?: string;
  tool_call?: ToolCall;
  tool_result?: ToolResult;
}

export interface AgentResponse {
  steps: AgentStep[];
  finalText: string;
}

export interface ModelInfo {
  id: string;          // e.g. "gpt-4o"
  name: string;        // Display name
  provider: string;    // e.g. "openai"
  description?: string;
  maxTokens?: number;
  supportsVision?: boolean;
  supportsStreaming?: boolean;
  supportsFunctionCalling?: boolean;
}

export interface ModelOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  topP?: number;
  stop?: string[];
  tools?: ToolDefinition[];
  tool_choice?: "auto" | "none" | { type: "function"; function: { name: string } };
}

export interface ModelAdapter {
  stream(
    messages: ChatMessage[],
    apiKey: string,
    options?: ModelOptions
  ): AsyncGenerator<string | ToolCall, void, unknown>;
}

export interface ConversationSummary {
  id: string;
  title: string;
  model: string;
  pinned: boolean;
  updatedAt: string;
  messageCount: number;
}

export interface StreamChunk {
  type: "text" | "done" | "error" | "tool_call";
  content?: string;
  tokens?: number;
  error?: string;
  tool_call?: ToolCall;
}

export type BubbleStyle = "modern" | "minimal" | "terminal" | "cute";
export type Theme = "light" | "dark" | "system";
export type FontSize = "sm" | "md" | "lg";

export interface UserSettingsData {
  theme: Theme;
  fontSize: FontSize;
  bubbleStyle: BubbleStyle;
  fontFamily: string;
  codeTheme: string;
  language: string;
  systemPrompt: string;
  streamingEnabled: boolean;
  temperature: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;
  contextLength: number;
  localEndpointUrl: string;
  defaultModel: string;
  agentAvatar?: string | null;
}

export interface PresetPromptData {
  id: string;
  name: string;
  content: string;
}

// ===== Life Map Types =====

export interface LifeMapData {
  id: string;
  currentPosition: CurrentPosition | null;
  paths: LifePathData[];
}

export interface CurrentPosition {
  stage: string;
  resources: string[];
  constraints: string[];
  focus: string;
}

export interface LifePathData {
  id: string;
  key: string;
  label: string;
  description: string | null;
  color: string | null;
  active: boolean;
  order: number;
  nodes: LifeNodeData[];
}

export interface LifeNodeData {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "active" | "completed" | "skipped";
  abilityTags: string[];
  historyNotes: HistoryNote[];
  nextSuggestions: string[];
  position: number;
  branches: LifeBranchData[];
}

export interface LifeBranchData {
  id: string;
  title: string;
  description: string | null;
  abandonReason: string | null;
  cost: string | null;
  consequence: string | null;
  active: boolean;
}

export interface HistoryNote {
  date: string;
  note: string;
}

export type LifePathKey = "survival" | "skill" | "income" | "migration" | "creation" | "health";

export const LIFE_PATH_CONFIG: Record<LifePathKey, { label: string; description: string; color: string; icon: string }> = {
  survival: { label: "生存", description: "基本生活保障、住所、日常运转", color: "#34c759", icon: "🏠" },
  skill: { label: "技能", description: "学习、成长、专业能力建设", color: "#0071e3", icon: "📚" },
  income: { label: "收入", description: "职业收入、副业、财务增长", color: "#ff9500", icon: "💰" },
  migration: { label: "迁移", description: "城市切换、环境变化、人生转折", color: "#af52de", icon: "🚀" },
  creation: { label: "作品", description: "创作、项目、个人品牌积累", color: "#ff2d55", icon: "🎨" },
  health: { label: "健康", description: "身体、心理、精力管理", color: "#30d158", icon: "💪" },
};
