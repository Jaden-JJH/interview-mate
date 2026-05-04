"use client";

import { useEffect, useState } from "react";
import LottieAnimation from "./LottieAnimation";

interface ClickInstance {
  id: number;
  x: number;
  y: number;
}

export default function GlobalClickEffect() {
  const [clicks, setClicks] = useState<ClickInstance[]>([]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Don't trigger if they are clicking a button that scales (it can be distracting),
      // or maybe just trigger everywhere. Let's trigger everywhere for now.
      const newClick = { id: Date.now(), x: e.clientX, y: e.clientY };
      setClicks((prev) => [...prev, newClick]);

      // Remove after 1 second
      setTimeout(() => {
        setClicks((prev) => prev.filter((c) => c.id !== newClick.id));
      }, 1000);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  if (clicks.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {clicks.map((click) => (
        <div
          key={click.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-20 h-20"
          style={{ left: click.x, top: click.y }}
        >
          <LottieAnimation src="/lottie/Click Effect.json" loop={false} />
        </div>
      ))}
    </div>
  );
}
