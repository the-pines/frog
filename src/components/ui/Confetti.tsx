'use client';

import * as React from 'react';

type ConfettiBurstProps = {
  /** Changing this value retriggers the burst */
  burstKey?: number | string;
  /** Number of pieces to render */
  pieces?: number;
  /** Optional list of emojis to use */
  emojis?: string[];
  /** Duration of the animation in ms */
  durationMs?: number;
  /** Optional className to position the container */
  className?: string;
};

/**
 * Very lightweight emoji-based confetti burst that self-cleans after finishing.
 * It renders absolutely within its container. Wrap the container in relative.
 */
export const ConfettiBurst: React.FC<ConfettiBurstProps> = ({
  burstKey,
  pieces = 18,
  emojis = ['✨', '🎉', '💸', '🐸', '💚'],
  durationMs = 900,
  className,
}) => {
  const [alive, setAlive] = React.useState(true);
  React.useEffect(() => {
    setAlive(true);
    const id = setTimeout(() => setAlive(false), durationMs + 50);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey]);

  if (!alive) return null;

  const items = Array.from({ length: pieces }).map((_, i) => {
    const angle = (i / pieces) * Math.PI * 2;
    const distance = 32 + Math.random() * 36; // px
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance * 0.9;
    const rot = Math.round(Math.random() * 360);
    const delay = Math.random() * 60; // ms
    const emoji = emojis[i % emojis.length];
    const style: React.CSSProperties & Record<'--x' | '--y', string> = {
      transform: `translate(0, 0) rotate(${rot}deg)`,
      animation: `confetti-pop ${durationMs}ms cubic-bezier(.22,.61,.36,1) ${delay}ms forwards`,
      '--x': `${x}px`,
      '--y': `${y}px`,
    };
    return (
      <span
        key={i}
        className="pointer-events-none select-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-base"
        style={style}
        aria-hidden
      >
        {emoji}
      </span>
    );
  });

  return <div className={`absolute inset-0 ${className || ''}`}>{items}</div>;
};

export default ConfettiBurst;
