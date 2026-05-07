"use client";

import React, { useRef } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";

// Aceternity moving-border. 박스 둘레를 따라 글로우가 회전하는 카드.
// 원본의 button 중심 + 가운데 정렬 가정을 풀어, 멀티라인 카드로도 쓸 수
// 있게 했다 — `containerClassName`으로 외곽 크기를 자유롭게 받고,
// `innerClassName`으로 inner 정렬/패딩을 모두 덮을 수 있다.
export function MovingBorderBox({
  borderRadius = "1rem",
  children,
  as: Component = "div",
  containerClassName,
  borderClassName,
  innerClassName,
  glowColor,
  duration = 3000,
  ...otherProps
}: {
  borderRadius?: string;
  children: React.ReactNode;
  as?: React.ElementType;
  containerClassName?: string;
  borderClassName?: string;
  innerClassName?: string;
  // 라디얼 글로우 색. 페르소나 accentColor 같은 임의 hex 받기 위해 prop으로.
  glowColor?: string;
  duration?: number;
  [key: string]: unknown;
}) {
  // 둘레 글로우의 가시성 = (글로우 색상 * 글로우 크기) - inner bg가 가리는 면적.
  // p-[2px]로 1.5px → 2px 두께로 살짝 늘리고, 글로우는 32x32로 키우고
  // gradient stop을 30/70으로 더 saturated하게 바꿔 inner가 white일 때
  // 띠가 또렷이 보이도록 한다. inner는 호출부에서 bg-white를 줘야 효과가 산다.
  return (
    <Component
      className={cn(
        "relative overflow-hidden p-[2px] bg-transparent",
        containerClassName
      )}
      style={{ borderRadius }}
      {...otherProps}
    >
      <div
        className="absolute inset-0"
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        <MovingBorder duration={duration} rx="30%" ry="30%">
          <div
            className={cn("h-32 w-32 opacity-90", borderClassName)}
            style={{
              background: glowColor
                ? `radial-gradient(circle, ${glowColor} 30%, transparent 70%)`
                : "radial-gradient(circle, var(--blue-primary) 30%, transparent 70%)",
            }}
          />
        </MovingBorder>
      </div>

      <div
        className={cn("relative h-full w-full", innerClassName)}
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        {children}
      </div>
    </Component>
  );
}

export const MovingBorder = ({
  children,
  duration = 3000,
  rx,
  ry,
  ...otherProps
}: {
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  [key: string]: unknown;
}) => {
  const pathRef = useRef<SVGRectElement | null>(null);
  const progress = useMotionValue<number>(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength();
    if (length) {
      const pxPerMillisecond = length / duration;
      progress.set((time * pxPerMillisecond) % length);
    }
  });

  const x = useTransform(
    progress,
    (val) => pathRef.current?.getPointAtLength(val).x ?? 0
  );
  const y = useTransform(
    progress,
    (val) => pathRef.current?.getPointAtLength(val).y ?? 0
  );

  const transform = useMotionTemplate`translateX(${x}px) translateY(${y}px) translateZ(0)`;

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute h-full w-full"
        width="100%"
        height="100%"
        {...otherProps}
      >
        <rect
          fill="none"
          width="100%"
          height="100%"
          rx={rx}
          ry={ry}
          ref={pathRef}
        />
      </svg>
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "inline-block",
          transform,
        }}
      >
        {children}
      </motion.div>
    </>
  );
};
