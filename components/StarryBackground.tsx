"use client";

import { ShootingStars } from "@/components/ui/shooting-stars";
import { StarsBackground } from "@/components/ui/stars-background";

export default function StarryBackground() {
  return (
    <div
      aria-hidden
      className="hidden md:block fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center, #0F2447 0%, #060E1F 70%, #03070F 100%)",
      }}
    >
      <StarsBackground
        starDensity={0.00018}
        minTwinkleSpeed={0.6}
        maxTwinkleSpeed={1.4}
      />
      <ShootingStars
        starColor="#FFFFFF"
        trailColor="#5B8DEF"
        minSpeed={12}
        maxSpeed={26}
        minDelay={1600}
        maxDelay={4200}
        starWidth={12}
      />
      <ShootingStars
        starColor="#C9DCFF"
        trailColor="#1B64DA"
        minSpeed={8}
        maxSpeed={18}
        minDelay={2800}
        maxDelay={5400}
        starWidth={9}
      />
    </div>
  );
}
