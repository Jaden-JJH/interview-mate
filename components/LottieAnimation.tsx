"use client";

import Lottie, { LottieRefCurrentProps } from "lottie-react";
import { useEffect, useState, useRef } from "react";

interface LottieAnimationProps {
  src: string;
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  playing?: boolean;
}

export default function LottieAnimation({
  src,
  className = "",
  loop = true,
  autoplay = true,
  playing = true,
}: LottieAnimationProps) {
  const [animationData, setAnimationData] = useState(null);
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  useEffect(() => {
    fetch(src)
      .then((res) => res.json())
      .then((data) => setAnimationData(data))
      .catch(() => {});
  }, [src]);

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
