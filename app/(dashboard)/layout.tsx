"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import AmbientBackground from "@/components/layout/ambient-background";
import FloatingActionButton from "@/components/layout/fab";
import SettingsModal from "@/components/settings/settings-modal";
import GoalsModal from "@/components/goals/goals-modal";
import MemoriesModal from "@/components/memories/memories-modal";
import { useChatStore } from "@/lib/store/chat-store";
import { Toaster } from "@/components/ui/sonner";
import type { ModelInfo } from "@/lib/types";

async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    try {
      const data = await res.clone().json();
      if (data.code === "USER_NOT_FOUND") {
        signOut({ callbackUrl: "/auth/signin" });
      }
    } catch {}
  }
  return res;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const sidebarOpen = useChatStore((s) => s.sidebarOpen);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [memoriesOpen, setMemoriesOpen] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      safeFetch("/api/settings").then((res) => {
        if (res.ok) res.json().then((data) => {
          useChatStore.getState().setSettings(data);
          if (data.defaultModel) {
            useChatStore.getState().setSelectedModel(data.defaultModel);
          }
        });
      });
      safeFetch("/api/models").then((res) => {
        if (res.ok) res.json().then((data: { models: Record<string, ModelInfo[]> }) => {
          const models = Object.values(data.models || {}).flat() as ModelInfo[];
          useChatStore.getState().setAvailableModels(models);
        });
      });
    }
  }, [session]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary/60" />
      </div>
    );
  }

  if (!session) {
    redirect("/auth/signin");
    return null;
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      <AmbientBackground />
      <Sidebar
        onSettingsOpen={() => setSettingsOpen(true)}
        onGoalsOpen={() => setGoalsOpen(true)}
        onMemoriesOpen={() => setMemoriesOpen(true)}
      />
      <div className={`relative z-10 flex flex-1 flex-col transition-all duration-300 ${sidebarOpen ? "ml-0" : ""}`}>
        <Header onSettingsOpen={() => setSettingsOpen(true)} />
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
      <FloatingActionButton />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <GoalsModal open={goalsOpen} onClose={() => setGoalsOpen(false)} />
      <MemoriesModal open={memoriesOpen} onClose={() => setMemoriesOpen(false)} />
      <Toaster />
    </div>
  );
}
