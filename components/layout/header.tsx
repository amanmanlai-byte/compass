"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useChatStore } from "@/lib/store/chat-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
} from "@/components/ui/select";
import {
  PanelLeftIcon,
  SettingsIcon,
  LogOutIcon,
  MessageSquareIcon,
  GlobeIcon,
  BrainCircuitIcon,
  CheckIcon,
  XIcon,
  CameraIcon,
} from "lucide-react";
import Link from "next/link";

interface HeaderProps {
  className?: string;
  onSettingsOpen?: () => void;
}

export default function Header({ className, onSettingsOpen }: HeaderProps) {
  const { data: session } = useSession();
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const setSidebarOpen = useChatStore((s) => s.setSidebarOpen);
  const currentConversationId = useChatStore((s) => s.currentConversationId);
  const conversations = useChatStore((s) => s.conversations);
  const selectedModel = useChatStore((s) => s.selectedModel);
  const setSelectedModel = useChatStore((s) => s.setSelectedModel);
  const availableModels = useChatStore((s) => s.availableModels);
  const webSearchEnabled = useChatStore((s) => s.webSearchEnabled);
  const setWebSearchEnabled = useChatStore((s) => s.setWebSearchEnabled);
  const selectedPerspective = useChatStore((s) => s.selectedPerspective);
  const setSelectedPerspective = useChatStore((s) => s.setSelectedPerspective);
  const perspectivesList = useChatStore((s) => s.perspectivesList);
  const setPerspectivesList = useChatStore((s) => s.setPerspectivesList);

  const [perspectivesOpen, setPerspectivesOpen] = useState(false);

  useEffect(() => {
    fetch("/api/perspectives")
      .then((res) => res.ok && res.json())
      .then((data) => { if (data?.perspectives) setPerspectivesList(data.perspectives); })
      .catch(() => {});
  }, [setPerspectivesList]);

  const currentConversation = conversations.find((c) => c.id === currentConversationId);

  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const modelsByProvider = availableModels.reduce<Record<string, { model: typeof availableModels[0]; value: string }[]>>(
    (acc, model) => {
      const value = `${model.provider}:${model.id}`;
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push({ model, value });
      return acc;
    },
    {}
  );

  return (
    <header
      className={cn(
        "glass-header flex h-12 shrink-0 items-center justify-between px-4 z-10",
        className
      )}
    >
      {/* Left */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]"
        >
          <PanelLeftIcon className="size-4" />
        </Button>

        {currentConversation ? (
          <span className="max-w-48 truncate text-sm font-medium text-foreground/80">
            {currentConversation.title}
          </span>
        ) : (
          <span className="text-sm text-muted-foreground/60">选择或新建对话</span>
        )}
      </div>

      {/* Center */}
      <div className="flex items-center gap-1.5">
        <Select value={selectedModel} onValueChange={(value) => {
          if (!value) return;
          setSelectedModel(value);
          fetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ defaultModel: value }),
          }).catch(() => {});
        }}>
          <SelectTrigger className="w-44 h-7 text-xs bg-white/[0.04] border-white/[0.06] text-muted-foreground hover:bg-white/[0.06] hover:border-white/[0.1] rounded-xl">
            <SelectValue placeholder="选择模型" />
          </SelectTrigger>
          <SelectContent className="glass-dialog">
            {Object.entries(modelsByProvider).map(([provider, models]) => (
              <SelectGroup key={provider}>
                <SelectLabel className="text-muted-foreground/60 capitalize text-[10px]">{provider}</SelectLabel>
                {models.map(({ model, value }) => (
                  <SelectItem key={value} value={value} className="text-foreground/80 hover:text-foreground/90 hover:bg-white/[0.06] focus:bg-white/[0.08]">
                    <span className="flex items-center gap-1.5">
                      {model.name}
                      {model.supportsVision && <CameraIcon className="size-3 text-muted-foreground/60" />}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            {availableModels.length === 0 && (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground/60">暂无可选模型</div>
            )}
          </SelectContent>
        </Select>

        {/* Perspective selector */}
        <Popover open={perspectivesOpen} onOpenChange={setPerspectivesOpen}>
          <PopoverTrigger
            render={
              <Button
                variant={selectedPerspective ? "secondary" : "ghost"}
                size="icon"
                className={cn(
                  "relative size-7 rounded-xl",
                  selectedPerspective
                    ? "bg-white/[0.08] text-foreground"
                    : "text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.06]"
                )}
              >
                <BrainCircuitIcon className="size-3.5" />
                {selectedPerspective && (
                  <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-blue-400" />
                )}
              </Button>
            }
          />
          <PopoverContent align="center" className="w-72 p-0 glass-dialog">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">思维视角</span>
              {selectedPerspective && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setSelectedPerspective(null); setPerspectivesOpen(false); }}
                  className="text-muted-foreground/60 hover:text-red-400 size-5"
                >
                  <XIcon className="size-3" />
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-72">
              <div className="p-1">
                {perspectivesList.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-muted-foreground/60">暂无可用的思维视角</div>
                ) : (
                  perspectivesList.map((p) => {
                    const isSelected = selectedPerspective?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPerspective(isSelected ? null : { id: p.id, name: p.name });
                          setPerspectivesOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                          isSelected ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:bg-white/[0.04]"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium truncate">{p.name}</span>
                            {isSelected && <CheckIcon className="size-3 shrink-0" />}
                          </div>
                          {p.tagline && <p className="mt-0.5 text-xs text-muted-foreground/80 line-clamp-2">{p.tagline}</p>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Web search toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWebSearchEnabled(!webSearchEnabled)}
          className={cn(
            "size-7 rounded-xl",
            webSearchEnabled
              ? "bg-white/[0.08] text-foreground"
              : "text-muted-foreground/80 hover:text-foreground/70 hover:bg-white/[0.06]"
          )}
        >
          <GlobeIcon className="size-3.5" />
        </Button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-full size-8 text-muted-foreground hover:text-foreground/80 hover:bg-white/[0.06]">
                <Avatar size="sm">
                  {session?.user?.image ? (
                    <AvatarImage src={session.user.image} alt={session.user.name || ""} />
                  ) : (
                    <AvatarFallback className="bg-white/[0.06] text-muted-foreground text-xs">
                      {getInitials(session?.user?.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-52 glass-dialog">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{session?.user?.name || "用户"}</span>
                  <span className="text-xs text-muted-foreground/80">{session?.user?.email}</span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onSettingsOpen?.()} className="text-muted-foreground hover:text-foreground/90 hover:bg-white/[0.06] focus:bg-white/[0.06]">
                <SettingsIcon className="size-4" />
                设置
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/history" />} className="text-muted-foreground hover:text-foreground/90 hover:bg-white/[0.06] focus:bg-white/[0.06]">
                <MessageSquareIcon className="size-4" />
                历史记录
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-white/[0.06]" />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            >
              <LogOutIcon className="size-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
