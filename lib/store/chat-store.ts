import { create } from "zustand";
import type { ChatMessage, ConversationSummary, ModelInfo, UserSettingsData } from "@/lib/types";

interface PerspectiveSummary {
  id: string;
  name: string;
  description: string;
  tagline: string;
}

interface ChatState {
  // Conversations list
  conversations: ConversationSummary[];
  currentConversationId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;

  // Model
  selectedModel: string;
  availableModels: ModelInfo[];

  // Settings
  settings: UserSettingsData;

  // UI
  sidebarOpen: boolean;
  settingsOpen: boolean;
  webSearchEnabled: boolean;

  // Perspective
  selectedPerspective: { id: string; name: string } | null;
  perspectivesList: PerspectiveSummary[];

  // Actions
  setConversations: (conversations: ConversationSummary[]) => void;
  setCurrentConversation: (id: string | null) => void;
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateLastMessage: (content: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;
  setSelectedModel: (model: string) => void;
  setAvailableModels: (models: ModelInfo[]) => void;
  setSettings: (settings: Partial<UserSettingsData>) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setWebSearchEnabled: (enabled: boolean) => void;
  resetMessages: () => void;
  setSelectedPerspective: (perspective: { id: string; name: string } | null) => void;
  setPerspectivesList: (list: PerspectiveSummary[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isStreaming: false,
  selectedModel: "openai:gpt-4o-mini",
  availableModels: [],
  selectedPerspective: null,
  perspectivesList: [],
  settings: {
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
    agentAvatar: null,
  },
  sidebarOpen: true,
  settingsOpen: false,
  webSearchEnabled: false,

  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (id) => set({ currentConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content,
        };
      }
      return { messages };
    }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setAvailableModels: (models) => set({ availableModels: models }),
  setSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),
  resetMessages: () => set({ messages: [] }),
  setSelectedPerspective: (perspective) => set({ selectedPerspective: perspective }),
  setPerspectivesList: (list) => set({ perspectivesList: list }),
}));
