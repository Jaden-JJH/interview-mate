// JSON 캐싱과 fallbackSrc를 지원하는 Lottie 애니메이션 래퍼 컴포넌트
"use client";

import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { memo, useEffect, useState, useRef } from "react";

// Dedupe fetches across instances. Same src used in multiple places (e.g.
// Talking Character on hero + STEP 03, Coin in CreditBadge across pages)
// shares one network request and one parsed JSON.
const jsonCache = new Map<string, Promise<unknown>>();

function loadJson(url: string): Promise<unknown> {
  let p = jsonCache.get(url);
  if (!p) {
    p = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        // Drop failed entry so a later mount can retry.
        jsonCache.delete(url);
        throw err;
      });
    jsonCache.set(url, p);
  }
  return p;
}

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
    (async () => {
      try {
        const data = await loadJson(src);
        if (!cancelled) setAnimationData(data as null);
      } catch {
        if (!fallbackSrc) return;
        try {
          const data = await loadJson(fallbackSrc);
          if (!cancelled) setAnimationData(data as null);
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
