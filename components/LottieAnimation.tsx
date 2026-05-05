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
}

function LottieAnimation({
  src,
  fallbackSrc,
  className = "",
  loop = true,
  autoplay = true,
  playing = true,
}: LottieAnimationProps) {
  const [animationData, setAnimationData] = useState(null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
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
  }, [src, fallbackSrc]);

  useEffect(() => {
    if (lottieRef.current) {
      if (playing) {
        lottieRef.current.play();
      } else {
        lottieRef.current.pause();
      }
    }
  }, [playing]);

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
