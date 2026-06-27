"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useChatStore } from "@/lib/store/chat-store";

type Locale = "zh" | "en";

const translations: Record<Locale, Record<string, string>> = {
  zh: {
    "app.name": "AI Chat",
    "app.tagline": "多模型 AI 聊天助手",
    "sidebar.new_chat": "新对话",
    "sidebar.search": "搜索对话...",
    "sidebar.today": "今天",
    "sidebar.this_week": "本周",
    "sidebar.earlier": "更早",
    "sidebar.history": "历史记录",
    "sidebar.settings": "设置",
    "chat.placeholder": "输入消息...",
    "chat.send": "发送",
    "chat.stop": "停止",
    "chat.regenerate": "重新生成",
    "chat.copy": "复制",
    "chat.copied": "已复制",
    "chat.like": "赞",
    "chat.dislike": "踩",
    "chat.delete": "删除",
    "chat.rename": "重命名",
    "chat.pin": "置顶",
    "chat.unpin": "取消置顶",
    "chat.export": "导出",
    "chat.export_all": "导出全部",
    "chat.no_conversation": "选择一个对话或开启新对话",
    "chat.model_select": "选择模型",
    "chat.web_search": "联网搜索",
    "chat.upload_file": "上传文件",
    "chat.upload_image": "上传图片",
    "chat.voice_input": "语音输入",
    "chat.thinking": "思考中...",
    "chat.empty_history": "暂无对话记录",
    "settings.title": "设置",
    "settings.models": "模型与 API Key",
    "settings.appearance": "外观风格",
    "settings.prompts": "系统提示词",
    "settings.advanced": "高级设置",
    "settings.language": "界面语言",
    "settings.language_zh": "简体中文",
    "settings.language_en": "English",
    "settings.theme": "主题",
    "settings.theme_light": "浅色",
    "settings.theme_dark": "深色",
    "settings.theme_system": "跟随系统",
    "settings.font_size": "字体大小",
    "settings.font_size_sm": "小",
    "settings.font_size_md": "中",
    "settings.font_size_lg": "大",
    "settings.bubble_style": "气泡风格",
    "settings.bubble_modern": "现代",
    "settings.bubble_minimal": "极简",
    "settings.bubble_terminal": "终端",
    "settings.bubble_cute": "可爱",
    "settings.font_family": "字体",
    "settings.font_system": "系统默认",
    "settings.font_jetbrains": "JetBrains Mono",
    "settings.font_pingfang": "苹方 / 思源黑体",
    "settings.code_theme": "代码高亮主题",
    "settings.system_prompt": "系统提示词",
    "settings.api_key": "API Key",
    "settings.api_key_save": "保存",
    "settings.api_key_saved": "已保存",
    "settings.api_key_test": "测试连接",
    "settings.api_key_testing": "测试中...",
    "settings.temperature": "温度",
    "settings.max_tokens": "最大 Token 数",
    "settings.streaming": "流式输出",
    "settings.context_length": "上下文长度",
    "settings.frequency_penalty": "频率惩罚",
    "settings.presence_penalty": "存在惩罚",
    "settings.local_endpoint": "本地模型地址",
    "settings.local_endpoint_desc": "Ollama 或其他兼容 OpenAI API 的本地服务地址",
    "settings.local_models": "本地模型 (Ollama)",
    "settings.local_models_desc": "无需 API Key，需先在本机安装并运行 Ollama",
    "auth.sign_in": "登录",
    "auth.sign_up": "注册",
    "auth.sign_out": "退出登录",
    "auth.email": "邮箱",
    "auth.password": "密码",
    "auth.name": "昵称",
    "auth.confirm_password": "确认密码",
    "auth.google": "使用 Google 登录",
    "auth.no_account": "还没有账号？",
    "auth.has_account": "已有账号？",
    "auth.register_now": "立即注册",
    "auth.sign_in_now": "立即登录",
    "error.unauthorized": "未登录",
    "error.invalid_key": "API Key 无效",
    "error.insufficient_quota": "API 余额不足",
    "error.network": "网络请求失败",
    "error.unknown": "未知错误",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.confirm": "确认",
    "common.search": "搜索",
    "common.loading": "加载中...",
    "common.no_data": "暂无数据",
    "common.clear_all": "清空全部",
    "common.export_json": "导出 JSON",
  },
  en: {
    "app.name": "AI Chat",
    "app.tagline": "Multi-Model AI Chat Assistant",
    "sidebar.new_chat": "New Chat",
    "sidebar.search": "Search conversations...",
    "sidebar.today": "Today",
    "sidebar.this_week": "This Week",
    "sidebar.earlier": "Earlier",
    "sidebar.history": "History",
    "sidebar.settings": "Settings",
    "chat.placeholder": "Type a message...",
    "chat.send": "Send",
    "chat.stop": "Stop",
    "chat.regenerate": "Regenerate",
    "chat.copy": "Copy",
    "chat.copied": "Copied",
    "chat.like": "Like",
    "chat.dislike": "Dislike",
    "chat.delete": "Delete",
    "chat.rename": "Rename",
    "chat.pin": "Pin",
    "chat.unpin": "Unpin",
    "chat.export": "Export",
    "chat.export_all": "Export All",
    "chat.no_conversation": "Select a conversation or start a new one",
    "chat.model_select": "Select Model",
    "chat.web_search": "Web Search",
    "chat.upload_file": "Upload File",
    "chat.upload_image": "Upload Image",
    "chat.voice_input": "Voice Input",
    "chat.thinking": "Thinking...",
    "chat.empty_history": "No conversations yet",
    "settings.title": "Settings",
    "settings.models": "Models & API Keys",
    "settings.appearance": "Appearance",
    "settings.prompts": "System Prompts",
    "settings.advanced": "Advanced",
    "settings.language": "Language",
    "settings.language_zh": "简体中文",
    "settings.language_en": "English",
    "settings.theme": "Theme",
    "settings.theme_light": "Light",
    "settings.theme_dark": "Dark",
    "settings.theme_system": "System",
    "settings.font_size": "Font Size",
    "settings.font_size_sm": "Small",
    "settings.font_size_md": "Medium",
    "settings.font_size_lg": "Large",
    "settings.bubble_style": "Bubble Style",
    "settings.bubble_modern": "Modern",
    "settings.bubble_minimal": "Minimal",
    "settings.bubble_terminal": "Terminal",
    "settings.bubble_cute": "Cute",
    "settings.font_family": "Font",
    "settings.font_system": "System Default",
    "settings.font_jetbrains": "JetBrains Mono",
    "settings.font_pingfang": "PingFang / Noto Sans SC",
    "settings.code_theme": "Code Theme",
    "settings.system_prompt": "System Prompt",
    "settings.api_key": "API Key",
    "settings.api_key_save": "Save",
    "settings.api_key_saved": "Saved",
    "settings.api_key_test": "Test",
    "settings.api_key_testing": "Testing...",
    "settings.temperature": "Temperature",
    "settings.max_tokens": "Max Tokens",
    "settings.streaming": "Streaming Output",
    "settings.context_length": "Context Length",
    "settings.frequency_penalty": "Frequency Penalty",
    "settings.presence_penalty": "Presence Penalty",
    "settings.local_endpoint": "Local Model Endpoint",
    "settings.local_endpoint_desc": "Ollama or any OpenAI-compatible local endpoint URL",
    "settings.local_models": "Local Models (Ollama)",
    "settings.local_models_desc": "No API key needed. Install and run Ollama on your machine first.",
    "auth.sign_in": "Sign In",
    "auth.sign_up": "Sign Up",
    "auth.sign_out": "Sign Out",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Name",
    "auth.confirm_password": "Confirm Password",
    "auth.google": "Sign in with Google",
    "auth.no_account": "Don't have an account?",
    "auth.has_account": "Already have an account?",
    "auth.register_now": "Register Now",
    "auth.sign_in_now": "Sign In Now",
    "error.unauthorized": "Unauthorized",
    "error.invalid_key": "Invalid API Key",
    "error.insufficient_quota": "Insufficient API Quota",
    "error.network": "Network Error",
    "error.unknown": "Unknown Error",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.search": "Search",
    "common.loading": "Loading...",
    "common.no_data": "No Data",
    "common.clear_all": "Clear All",
    "common.export_json": "Export JSON",
  },
};

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextType>({
  locale: "zh",
  setLocale: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");

  // Sync from store on mount and when store changes
  useEffect(() => {
    const unsub = useChatStore.subscribe((state, prev) => {
      if (state.settings.language !== prev.settings.language) {
        setLocaleState(state.settings.language as Locale);
      }
    });
    // Initial sync
    const lang = useChatStore.getState().settings.language;
    if (lang === "en" || lang === "zh") {
      setLocaleState(lang);
    }
    return unsub;
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    useChatStore.getState().setSettings({ language: newLocale });
  }, []);

  const t = useCallback(
    (key: string): string => {
      return translations[locale]?.[key] || key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key] || key;
}
