"use client";

import { useEffect, useState } from "react";

/** Lightweight CSS-only fade/slide on content change — no animation library needed. */
export function FadeSwitch({ id, children }: { id: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, [id]);

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
