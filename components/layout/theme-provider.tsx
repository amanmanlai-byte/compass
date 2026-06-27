"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "@/lib/store/chat-store";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const storeTheme = useChatStore((s) => s.settings.theme);
  const [theme, setTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("compass-theme") || "system";
    }
    return "system";
  });

  // Sync from store when it changes (after API load)
  useEffect(() => {
    if (storeTheme && storeTheme !== theme) {
      setTheme(storeTheme);
      localStorage.setItem("compass-theme", storeTheme);
    }
  }, [storeTheme]);

  useEffect(() => {
    const root = document.documentElement;

    const apply = (t: string) => {
      root.classList.remove("light", "dark");
      if (t === "dark") {
        root.classList.add("dark");
      } else if (t === "light") {
        root.classList.add("light");
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.add(prefersDark ? "dark" : "light");
      }
    };

    apply(theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  // Expose setTheme for settings to call directly
  useEffect(() => {
    (window as any).__setTheme = (t: string) => {
      localStorage.setItem("compass-theme", t);
      setTheme(t);
    };
    return () => { delete (window as any).__setTheme; };
  }, []);

  return <>{children}</>;
}
