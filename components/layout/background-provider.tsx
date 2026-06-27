"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export type BackgroundPreset = "mesh" | "aurora" | "void" | "midnight" | "none";

interface BackgroundContextValue {
  background: BackgroundPreset;
  setBackground: (bg: BackgroundPreset) => void;
}

const BackgroundContext = createContext<BackgroundContextValue>({
  background: "mesh",
  setBackground: () => {},
});

export function useBackground() {
  return useContext(BackgroundContext);
}

const PRESETS: { id: BackgroundPreset; label: string; emoji: string }[] = [
  { id: "mesh", label: "网格", emoji: "◐" },
  { id: "aurora", label: "极光", emoji: "◑" },
  { id: "void", label: "虚空", emoji: "◒" },
  { id: "midnight", label: "午夜", emoji: "◓" },
  { id: "none", label: "纯净", emoji: "●" },
];

export { PRESETS };

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [background, setBackgroundState] = useState<BackgroundPreset>("mesh");

  useEffect(() => {
    const saved = localStorage.getItem("compass-bg") as BackgroundPreset | null;
    if (saved && PRESETS.some((p) => p.id === saved)) {
      setBackgroundState(saved);
    }
  }, []);

  const setBackground = useCallback((bg: BackgroundPreset) => {
    setBackgroundState(bg);
    localStorage.setItem("compass-bg", bg);
  }, []);

  return (
    <BackgroundContext.Provider value={{ background, setBackground }}>
      {children}
    </BackgroundContext.Provider>
  );
}
