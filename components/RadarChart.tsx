// 면접 역량 점수를 레이더(거미줄) 차트로 시각화하는 SVG 컴포넌트
"use client";

import { motion } from "framer-motion";

interface RadarData {
  label: string;
  value: number; // 0 to 100
}

interface RadarChartProps {
  data: RadarData[];
  size?: number;
}

export default function RadarChart({ data, size = 240 }: RadarChartProps) {
  const center = size / 2;
  const radius = size / 2 - 40; // leave room for labels
  const angleSlice = (Math.PI * 2) / data.length;

  // Generate background webs
  const levels = 4;
  const webs = Array.from({ length: levels }).map((_, i) => {
    const levelRadius = (radius / levels) * (i + 1);
    const points = data.map((_, j) => {
      const x = center + levelRadius * Math.cos(j * angleSlice - Math.PI / 2);
      const y = center + levelRadius * Math.sin(j * angleSlice - Math.PI / 2);
      return `${x},${y}`;
    });
    return points.join(" ");
  });

  // Generate data polygon
  const dataPoints = data.map((d, i) => {
    const r = (d.value / 100) * radius;
    const x = center + r * Math.cos(i * angleSlice - Math.PI / 2);
    const y = center + r * Math.sin(i * angleSlice - Math.PI / 2);
    return `${x},${y}`;
  });

  // Calculate label positions
  const labelPositions = data.map((d, i) => {
    // slightly further out than the max radius
    const labelRadius = radius + 25;
    const x = center + labelRadius * Math.cos(i * angleSlice - Math.PI / 2);
    const y = center + labelRadius * Math.sin(i * angleSlice - Math.PI / 2);
    return { x, y, label: d.label, value: d.value };
  });

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Draw background polygons */}
        {webs.map((points, i) => (
          <polygon
            key={i}
            points={points}
            fill="none"
            stroke="var(--gray-200)"
            strokeWidth="1"
          />
        ))}

        {/* Draw spokes */}
        {labelPositions.map((p, i) => (
          <line
            key={`spoke-${i}`}
            x1={center}
            y1={center}
            x2={center + radius * Math.cos(i * angleSlice - Math.PI / 2)}
            y2={center + radius * Math.sin(i * angleSlice - Math.PI / 2)}
            stroke="var(--gray-200)"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Draw data polygon (animated) */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          style={{ transformOrigin: "center" }}
          points={dataPoints.join(" ")}
          fill="rgba(27, 100, 218, 0.2)" // service blue light
          stroke="var(--blue-primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Draw data points */}
        {dataPoints.map((p, i) => {
          const [x, y] = p.split(",");
          return (
            <motion.circle
              key={`point-${i}`}
              initial={{ r: 0 }}
              animate={{ r: 4 }}
              transition={{ duration: 0.3, delay: 0.6 + i * 0.1 }}
              cx={x}
              cy={y}
              fill="var(--blue-primary)"
            />
          );
        })}

        {/* Draw labels */}
        {labelPositions.map((pos, i) => {
          // Adjust text anchor based on position to prevent overlap
          let anchor: "middle" | "start" | "end" = "middle";
          if (pos.x < center - 10) anchor = "end";
          if (pos.x > center + 10) anchor = "start";

          return (
            <text
              key={`label-${i}`}
              x={pos.x}
              y={pos.y}
              dy="4" // vertical center adjustment
              textAnchor={anchor}
              className="text-[12px] font-semibold fill-[var(--gray-600)]"
            >
              {pos.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
