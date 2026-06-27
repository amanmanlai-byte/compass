"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/lib/store/chat-store";
import { PlusIcon, PenLineIcon, TargetIcon, ZapIcon, BrainCircuitIcon } from "lucide-react";
import { toast } from "sonner";

interface FabAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const selectedModel = useChatStore((s) => s.selectedModel);
  const setCurrentConversation = useChatStore((s) => s.setCurrentConversation);

  const handleQuickChat = useCallback(async (preset?: string) => {
    const message = preset || "今天的复盘";
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: message.slice(0, 30), model: selectedModel }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentConversation(data.id);
        sessionStorage.setItem("compass-pending-message", message);
        router.push("/chat");
      }
    } catch {
      toast.error("创建对话失败");
    }
  }, [selectedModel, setCurrentConversation, router]);

  const actions: FabAction[] = [
    { icon: <PenLineIcon className="size-4" />, label: "每日复盘", onClick: () => handleQuickChat("今天的复盘") },
    { icon: <TargetIcon className="size-4" />, label: "设定目标", onClick: () => router.push("/goals") },
    { icon: <ZapIcon className="size-4" />, label: "做决策", onClick: () => handleQuickChat("帮我分析一个决策") },
    { icon: <BrainCircuitIcon className="size-4" />, label: "记忆", onClick: () => router.push("/memories") },
  ];

  const toggle = useCallback(() => {
    if (isOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 300);
    } else {
      setIsOpen(true);
    }
  }, [isOpen]);

  const handleAction = useCallback((action: FabAction) => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      action.onClick();
    }, 200);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setIsClosing(true);
        setTimeout(() => { setIsOpen(false); setIsClosing(false); }, 300);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div className="fab-container">
      {/* Backdrop */}
      <div
        className={`fab-backdrop ${isOpen && !isClosing ? "fab-backdrop-open" : ""}`}
        onClick={() => {
          if (isOpen) {
            setIsClosing(true);
            setTimeout(() => { setIsOpen(false); setIsClosing(false); }, 300);
          }
        }}
      />

      {/* Menu */}
      <div ref={menuRef} className={`fab-menu ${(isOpen && !isClosing) ? "fab-menu-open" : ""}`}>
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={() => handleAction(action)}
            className={`fab-menu-item ${isClosing ? "fab-menu-item-closing" : ""}`}
            style={isClosing ? { transitionDelay: `${(actions.length - 1 - i) * 0.04}s` } : undefined}
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-black/[0.04] dark:bg-white/[0.06]">
              {action.icon}
            </span>
            {action.label}
          </button>
        ))}
      </div>

      {/* Trigger */}
      <button
        ref={triggerRef}
        onClick={toggle}
        className={`fab-trigger ${isOpen ? "fab-trigger-open" : ""}`}
        title="快捷操作"
      >
        <PlusIcon className="size-5" />
      </button>
    </div>
  );
}
