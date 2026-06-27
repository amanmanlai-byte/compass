"use client";

import { useBackground } from "./background-provider";

const BG_CLASS: Record<string, string> = {
  mesh: "bg-preset-mesh",
  aurora: "bg-preset-aurora",
  void: "bg-preset-void",
  midnight: "bg-preset-midnight",
  none: "bg-preset-none",
};

export default function AmbientBackground() {
  const { background } = useBackground();

  return (
    <>
      <div className={`ambient-bg ${BG_CLASS[background] || BG_CLASS.mesh}`} />
      {background !== "none" && (
        <>
          <div className="spatial-glow" style={{ top: "-200px", left: "10%", background: "rgba(99, 102, 241, 0.3)" }} />
          <div className="spatial-glow" style={{ bottom: "-200px", right: "10%", background: "rgba(168, 85, 247, 0.2)" }} />
        </>
      )}
    </>
  );
}
