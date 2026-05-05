"use client";

import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { memo, useEffect, useState, useRef } from "react";

interface LottieAnimationProps {
  src: string;
  fallbackSrc?: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  playing?: boolean;
  /** Defer fetch until the element nears the viewport (good for below-fold animations) */
  lazy?: boolean;
}

function LottieAnimation({
  src,
  fallbackSrc,
  className = "",
  loop = true,
  autoplay = true,
  playing = true,
  lazy = false,
}: LottieAnimationProps) {
  const [animationData, setAnimationData] = useState(null);
  const [shouldLoad, setShouldLoad] = useState(!lazy);
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver: start fetch only when near viewport
  useEffect(() => {
    if (!lazy) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [lazy]);

  useEffect(() => {
    if (!shouldLoad) return;
    let cancelled = false;
    const load = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`status ${res.status}`);
      return res.json();
    };
    (async () => {
      try {
        const data = await load(src);
        if (!cancelled) setAnimationData(data);
      } catch {
        if (!fallbackSrc) return;
        try {
          const data = await load(fallbackSrc);
          if (!cancelled) setAnimationData(data);
        } catch {}
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [src, fallbackSrc, shouldLoad]);

  useEffect(() => {
    if (lottieRef.current) {
      if (playing) {
        lottieRef.current.play();
      } else {
        lottieRef.current.pause();
      }
    }
  }, [playing]);

  if (lazy && !animationData) {
    return <div ref={containerRef} className={className} aria-hidden />;
  }
  if (!animationData) return null;

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      loop={loop}
      autoplay={playing ? autoplay : false}
      className={className}
    />
  );
}

// Memoize so frequent parent re-renders (e.g. an interval-based status text
// elsewhere on the page) don't cause the lottie player to redo prop diffing
// and frame work, which would visibly stutter the animation.
export default memo(LottieAnimation);
