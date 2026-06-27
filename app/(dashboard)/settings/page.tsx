"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useChatStore } from "@/lib/store/chat-store";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from "@/components/ui/select";
import { useBackground, PRESETS, type BackgroundPreset } from "@/components/layout/background-provider";
import { toast } from "sonner";
import {
  PaletteIcon,
  KeyRoundIcon,
  MessageSquareIcon,
  Settings2Icon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  PlusIcon,
  TestTubeIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  ImageIcon,
} from "lucide-react";
import type { BubbleStyle, Theme, FontSize, PresetPromptData } from "@/lib/types";

const PROVIDERS = [
  { id: "openai", name: "OpenAI", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "anthropic", name: "Anthropic", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "google", name: "Google", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "deepseek", name: "DeepSeek", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "mistral", name: "Mistral", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "groq", name: "Groq", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "xai", name: "xAI", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "moonshot", name: "Moonshot", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "qwen", name: "Qwen (阿里云)", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "baichuan", name: "Baichuan (百川)", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "yi", name: "Yi (零一万物)", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "glm", name: "GLM (智谱AI)", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "cohere", name: "Cohere", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "perplexity", name: "Perplexity", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
  { id: "together", name: "Together AI", keys: ["apiKey"], keyLabels: { apiKey: "API Key" } },
];

const PRESET_PROMPTS: PresetPromptData[] = [
  { id: "default", name: "默认助手", content: "你是用户的AI伙伴，叫Compass。说话自然、真诚，像一个靠谱的朋友。不要用官腔，不要说\"作为AI\"之类的话。直接回答问题，偶尔可以关心一下对方的状态。语气温和但不油腻，专业但不冷冰冰。" },
  { id: "coder", name: "编程专家", content: "你是一个资深软件工程师，擅长代码审查、架构设计和技术方案讨论。给出可运行的代码，解释清楚为什么这样做。遇到问题时，先帮对方理清思路，再给方案。" },
  { id: "writer", name: "写作助手", content: "你是一个写作搭档，擅长各种文体。帮忙打磨文字，让表达更清晰有力。不只是改错别字，会从读者视角给出建议。保持作者原本的风格和语气。" },
  { id: "translator", name: "翻译助手", content: "你是一个专业翻译。准确翻译文本，保持原意和语气。有多个翻译可能时，给出最佳选择并简要说明原因。" },
  { id: "tutor", name: "学习导师", content: "你是一个耐心的学习导师。用通俗的方式解释复杂概念，多用类比和例子。鼓励提问，不评判对方的问题是否\"笨\"。" },
];

export default function SettingsPage() {
  const settings = useChatStore((s) => s.settings);
  const setSettings = useChatStore((s) => s.setSettings);
  const { background, setBackground } = useBackground();

  const [apiKeys, setApiKeys] = useState<Record<string, Record<string, string>>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("api-keys");
  const [localEndpointUrl, setLocalEndpointUrl] = useState(settings.localEndpointUrl || "http://localhost:11434");

  useEffect(() => {
    fetch("/api/settings/apikeys").then((res) => res.ok && res.json()).then((data) => {
      if (data?.apiKeys) {
        const keys: Record<string, Record<string, string>> = {};
        data.apiKeys.forEach((item: { provider: string; keyMasked: string }) => {
          if (!keys[item.provider]) keys[item.provider] = {};
          keys[item.provider]["apiKey"] = item.keyMasked;
        });
        setApiKeys(keys);
      }
    }).catch(() => {});
  }, []);

  const handleApiKeyChange = useCallback((provider: string, keyType: string, value: string) => {
    setApiKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], [keyType]: value } }));
  }, []);

  const handleSaveApiKeys = useCallback(async () => {
    try {
      const entries = Object.entries(apiKeys);
      let successCount = 0;
      let failCount = 0;
      let skippedCount = 0;
      for (const [provider, keys] of entries) {
        const keyValue = keys["apiKey"];
        if (!keyValue) continue;
        if (keyValue.includes("****")) { skippedCount++; continue; }
        const res = await fetch("/api/settings/apikeys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, key: keyValue }) });
        if (res.ok) successCount++; else failCount++;
      }
      if (successCount > 0) toast.success(`已保存 ${successCount} 个 API Key`);
      if (skippedCount > 0) toast.info(`跳过 ${skippedCount} 个未修改的 Key`);
      if (failCount > 0) toast.error(`${failCount} 个 API Key 保存失败`);
    } catch { toast.error("保存失败，请检查网络连接"); }
  }, [apiKeys]);

  const handleTestApiKey = useCallback(async (provider: string) => {
    setTestingKey(provider);
    try {
      const keyValue = apiKeys[provider]?.["apiKey"];
      if (!keyValue) { toast.error("请先输入 API Key"); setTestingKey(null); return; }
      const res = await fetch("/api/settings/apikeys/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, key: keyValue }) });
      const data = await res.json();
      if (data.success) toast.success(`${provider} 连接成功！`); else toast.error(data.error || `${provider} 连接失败`);
    } catch { toast.error("测试请求失败"); } finally { setTestingKey(null); }
  }, [apiKeys]);

  const handleSaveSettings = useCallback(async () => {
    try {
      const saveData = { ...settings, localEndpointUrl };
      const res = await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(saveData) });
      if (res.ok) toast.success("设置已保存"); else { const err = await res.json().catch(() => ({ error: "保存失败" })); toast.error(err.error || "保存失败"); }
    } catch { toast.error("保存失败，请检查网络连接"); }
  }, [settings, localEndpointUrl]);

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">设置</h1>
        <p className="text-sm text-muted-foreground/80">管理应用配置和偏好</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-8 w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-1">
          <TabsTrigger value="api-keys" className="flex-1 rounded-xl data-[state=active]:bg-white/[0.06] data-[state=active]:text-foreground text-muted-foreground/80 gap-1.5">
            <KeyRoundIcon className="size-3.5" />模型与API Key
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex-1 rounded-xl data-[state=active]:bg-white/[0.06] data-[state=active]:text-foreground text-muted-foreground/80 gap-1.5">
            <PaletteIcon className="size-3.5" />外观风格
          </TabsTrigger>
          <TabsTrigger value="system-prompt" className="flex-1 rounded-xl data-[state=active]:bg-white/[0.06] data-[state=active]:text-foreground text-muted-foreground/80 gap-1.5">
            <MessageSquareIcon className="size-3.5" />系统提示词
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex-1 rounded-xl data-[state=active]:bg-white/[0.06] data-[state=active]:text-foreground text-muted-foreground/80 gap-1.5">
            <Settings2Icon className="size-3.5" />高级设置
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: API Keys */}
        <TabsContent value="api-keys" className="space-y-5">
          <div className="glass-card p-5">
            <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">API Key 配置</p>
            <p className="mb-5 text-xs text-muted-foreground/60">配置各模型的 API Key，Key 会加密存储在服务器</p>
            <div className="space-y-3">
              {PROVIDERS.map((provider) => (
                <div key={provider.id} className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.03]">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="uppercase rounded-lg border-white/[0.06] text-muted-foreground/80 text-[10px]">{provider.name}</Badge>
                      {apiKeys[provider.id]?.apiKey && <Badge variant="secondary" className="gap-1 rounded-lg bg-emerald-500/10 text-emerald-400/70 border-emerald-500/20 text-[10px]"><CheckIcon className="size-3" />已配置</Badge>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleTestApiKey(provider.id)} disabled={testingKey === provider.id} className="text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.06] rounded-xl text-xs">
                      {testingKey === provider.id ? <LoaderCircleIcon className="size-3.5 animate-spin" /> : <TestTubeIcon className="size-3.5" />}
                      测试
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {provider.keys.map((keyType) => (
                      <div key={keyType} className="relative">
                        <label className="mb-1 block text-xs text-muted-foreground/60">{provider.keyLabels[keyType as keyof typeof provider.keyLabels]}</label>
                        <div className="relative">
                          <Input type={keyType === "apiKey" && !showKeys[provider.id] ? "password" : "text"} value={apiKeys[provider.id]?.[keyType] || ""} onChange={(e) => handleApiKeyChange(provider.id, keyType, e.target.value)} placeholder={keyType === "apiKey" ? `输入 ${provider.name} API Key` : "https://api.example.com"} className="pr-8 bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl" />
                          {keyType === "apiKey" && (
                            <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground/50" onClick={() => setShowKeys((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}>
                              {showKeys[provider.id] ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <Button onClick={handleSaveApiKeys} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">保存所有 API Key</Button>
            </div>
          </div>

          <div className="glass-card p-5">
            <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">本地模型 (Ollama)</p>
            <p className="mb-4 text-xs text-muted-foreground/60">无需 API Key，需先在本机安装并运行 Ollama。了解更多：ollama.com</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">本地服务地址</label>
                <Input value={settings.localEndpointUrl} onChange={(e) => setSettings({ localEndpointUrl: e.target.value })} placeholder="http://localhost:11434" className="bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl" />
                <p className="mt-1.5 text-xs text-muted-foreground/60">Ollama 默认地址 http://localhost:11434，兼容 OpenAI API 的本地服务均可使用</p>
              </div>
              <Button variant="ghost" size="sm" onClick={async () => { try { const res = await fetch(`${settings.localEndpointUrl}/api/tags`); if (res.ok) { const data = await res.json(); const models = data.models?.map((m: any) => m.name).join(", ") || "无可用模型"; toast.success(`本地 Ollama 连接成功！可用模型: ${models}`); } else toast.error("连接失败，请确认 Ollama 是否已启动"); } catch { toast.error("无法连接到本地服务"); } }} className="text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.06] rounded-xl">
                测试连接
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Appearance */}
        <TabsContent value="appearance" className="space-y-5">
          {/* Theme */}
          <div className="glass-card p-5">
            <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">主题</p>
            <p className="mb-4 text-xs text-muted-foreground/60">选择应用的主题模式</p>
            <div className="flex gap-3">
              {[
                { id: "light" as Theme, icon: SunIcon, label: "浅色" },
                { id: "dark" as Theme, icon: MoonIcon, label: "深色" },
                { id: "system" as Theme, icon: MonitorIcon, label: "跟随系统" },
              ].map((theme) => (
                <button key={theme.id} onClick={() => { setSettings({ theme: theme.id }); localStorage.setItem("compass-theme", theme.id); (window as any).__setTheme?.(theme.id); }} className={cn("flex flex-1 flex-col items-center gap-2 rounded-2xl border p-4 transition-all", settings.theme === theme.id ? "border-white/20 bg-white/[0.06] ring-1 ring-white/10" : "border-white/[0.04] hover:border-white/10")}>
                  <theme.icon className={cn("size-6", settings.theme === theme.id ? "text-foreground/80" : "text-muted-foreground/60")} />
                  <span className={cn("text-sm font-medium", settings.theme === theme.id ? "text-foreground" : "text-muted-foreground/80")}>{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Background */}
          <div className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="size-4 text-muted-foreground/60" />
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">背景氛围</p>
            </div>
            <p className="mb-4 text-xs text-muted-foreground/60">切换背景效果，所有背景都保留磨砂玻璃风格</p>
            <div className="grid grid-cols-5 gap-2">
              {PRESETS.map((preset) => (
                <button key={preset.id} onClick={() => setBackground(preset.id as BackgroundPreset)} className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border p-3 transition-all",
                  background === preset.id ? "border-white/20 bg-white/[0.06] ring-1 ring-white/10" : "border-white/[0.04] hover:border-white/10"
                )}>
                  <span className="text-lg">{preset.emoji}</span>
                  <span className={cn("text-[10px]", background === preset.id ? "text-foreground/80" : "text-muted-foreground/80")}>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Agent Avatar */}
          <div className="glass-card p-5">
            <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Agent 头像</p>
            <p className="mb-4 text-xs text-muted-foreground/60">自定义 AI 助手的头像</p>
            <div className="flex items-center gap-4">
              <div className="relative">
                {settings.agentAvatar ? (
                  <Image src={settings.agentAvatar} alt="Agent" width={64} height={64} unoptimized className="size-16 rounded-full object-cover ring-1 ring-white/10" />
                ) : (
                  <div className="flex size-16 items-center rounded-full bg-white/[0.06] text-xl ring-1 ring-white/[0.06]">🤖</div>
                )}
              </div>
              <div>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-white/[0.06] transition-colors">上传头像</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { toast.error("头像不能超过 5MB"); return; } const reader = new FileReader(); reader.onload = () => { setSettings({ agentAvatar: reader.result as string }); }; reader.readAsDataURL(file); }} />
                </label>
                {settings.agentAvatar && <Button variant="ghost" size="sm" className="ml-2 text-xs text-muted-foreground/60 hover:text-foreground/60 hover:bg-white/[0.06]" onClick={() => setSettings({ agentAvatar: null })}>恢复默认</Button>}
              </div>
            </div>
          </div>

          {/* Font Size */}
          <div className="glass-card p-5">
            <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">字体大小</p>
            <p className="mb-4 text-xs text-muted-foreground/60">调整聊天界面的字体大小</p>
            <div className="flex gap-3">
              {[
                { id: "sm" as FontSize, label: "小", preview: "Aa" },
                { id: "md" as FontSize, label: "中", preview: "Aa" },
                { id: "lg" as FontSize, label: "大", preview: "Aa" },
              ].map((size) => (
                <button key={size.id} onClick={() => setSettings({ fontSize: size.id })} className={cn("flex flex-1 flex-col items-center gap-1 rounded-2xl border p-3 transition-all", settings.fontSize === size.id ? "border-white/20 bg-white/[0.06] ring-1 ring-white/10" : "border-white/[0.04] hover:border-white/10")}>
                  <span className={cn(settings.fontSize === size.id ? "text-foreground" : "text-muted-foreground/80", size.id === "sm" && "text-sm", size.id === "md" && "text-base", size.id === "lg" && "text-lg")}>{size.preview}</span>
                  <span className={cn("text-xs", settings.fontSize === size.id ? "text-muted-foreground font-medium" : "text-muted-foreground/60")}>{size.label}</span>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: System Prompt */}
        <TabsContent value="system-prompt" className="space-y-5">
          <div className="glass-card p-5">
            <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">系统提示词</p>
            <p className="mb-5 text-xs text-muted-foreground/60">设置默认的系统提示词，用于控制 AI 的行为和回复风格</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-muted-foreground">自定义系统提示词</label>
                <Textarea value={settings.systemPrompt} onChange={(e) => setSettings({ systemPrompt: e.target.value })} placeholder="输入系统提示词..." className="min-h-32 bg-white/[0.04] border-white/[0.06] text-foreground placeholder:text-muted-foreground/60 rounded-xl" />
                <p className="mt-1.5 text-xs text-muted-foreground/60">留空则使用各模型的默认系统提示词</p>
              </div>
              <Separator className="bg-white/[0.04]" />
              <div>
                <label className="mb-3 block text-sm font-medium text-muted-foreground">预设模板</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PRESET_PROMPTS.map((prompt) => (
                    <button key={prompt.id} onClick={() => setSettings({ systemPrompt: prompt.content })} className={cn("rounded-2xl border p-3 text-left text-xs transition-all", settings.systemPrompt === prompt.content ? "border-white/15 bg-white/[0.06] text-foreground/80" : "border-white/[0.04] text-muted-foreground/80 hover:border-white/10")}>
                      <span className="block truncate font-medium">{prompt.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Advanced */}
        <TabsContent value="advanced" className="space-y-5">
          <div className="glass-card p-5">
            <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">模型参数</p>
            <p className="mb-5 text-xs text-muted-foreground/60">调整 AI 生成参数</p>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">温度 (Temperature)</label>
                  <span className="text-sm text-muted-foreground/80">{settings.temperature.toFixed(1)}</span>
                </div>
                <Slider value={[settings.temperature]} onValueChange={(value) => { const v = Array.isArray(value) ? value[0] : value; setSettings({ temperature: v }); }} min={0} max={2} step={0.1} />
                <div className="flex justify-between text-xs text-muted-foreground/60"><span>精确 (0)</span><span>创意 (2)</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">最大 Token 数</label>
                  <span className="text-sm text-muted-foreground/80">{settings.maxTokens}</span>
                </div>
                <Slider value={[settings.maxTokens]} onValueChange={(value) => { const v = Array.isArray(value) ? value[0] : value; setSettings({ maxTokens: v }); }} min={256} max={32768} step={256} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">频率惩罚</label>
                  <span className="text-sm text-muted-foreground/80">{settings.frequencyPenalty.toFixed(1)}</span>
                </div>
                <Slider value={[settings.frequencyPenalty]} onValueChange={(value) => { const v = Array.isArray(value) ? value[0] : value; setSettings({ frequencyPenalty: v }); }} min={-2} max={2} step={0.1} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">存在惩罚</label>
                  <span className="text-sm text-muted-foreground/80">{settings.presencePenalty.toFixed(1)}</span>
                </div>
                <Slider value={[settings.presencePenalty]} onValueChange={(value) => { const v = Array.isArray(value) ? value[0] : value; setSettings({ presencePenalty: v }); }} min={-2} max={2} step={0.1} />
              </div>
              <Separator className="bg-white/[0.04]" />
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">流式输出</label>
                  <p className="text-xs text-muted-foreground/60">启用后 AI 回复将实时显示</p>
                </div>
                <Switch checked={settings.streamingEnabled} onCheckedChange={(checked) => setSettings({ streamingEnabled: checked })} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground">上下文消息数</label>
                  <span className="text-sm text-muted-foreground/80">{settings.contextLength}</span>
                </div>
                <Slider value={[settings.contextLength]} onValueChange={(value) => { const v = Array.isArray(value) ? value[0] : value; setSettings({ contextLength: v }); }} min={1} max={100} step={1} />
                <p className="text-xs text-muted-foreground/60">发送到 AI 的历史消息数量</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {activeTab !== "api-keys" && (
        <div className="mt-8 flex justify-end">
          <Button onClick={handleSaveSettings} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl">
            <CheckIcon className="size-4" />保存设置
          </Button>
        </div>
      )}
    </div>
  );
}
