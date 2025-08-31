'use client';

import * as React from 'react';

interface ProgressCircleProps {
  size?: number;
  stroke?: number;
  percent: number; // 0..100
  label?: string;
  /** Animate the progress sweep */
  animate?: boolean;
  /** Optional accent gradient id suffix to avoid collisions */
  idSuffix?: string | number;
}

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

export const ProgressCircle: React.FC<ProgressCircleProps> = ({
  size = 96,
  stroke = 8,
  percent,
  label,
  animate = true,
  idSuffix,
}) => {
  const pct = clamp(Number.isFinite(percent) ? percent : 0);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (pct / 100) * circumference;
  const gradientId = `pc-grad-${idSuffix ?? size}-${stroke}`;

  return (
    <div
      style={{ width: size, height: size }}
      className="relative inline-block"
    >
      <svg width={size} height={size} className="block">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#836EF9" />
            <stop offset="50%" stopColor="#67DE8F" />
            <stop offset="100%" stopColor="#FF66C4" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          className="text-black/10 dark:text-white/20"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={
            animate
              ? ({
                  transition: 'stroke-dasharray 600ms ease, stroke 300ms ease',
                } as React.CSSProperties)
              : undefined
          }
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-xs text-center leading-tight">
          <div className="font-semibold">{Math.round(pct)}%</div>
          {label ? <div className="text-[10px] opacity-70">{label}</div> : null}
        </div>
      </div>
    </div>
  );
};

export default ProgressCircle;
