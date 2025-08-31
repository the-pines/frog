'use client';

import * as React from 'react';

interface SpinnerProps {
  size?: number;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 16, className }) => {
  const stroke = Math.max(2, Math.round(size / 8));
  return (
    <div
      role="status"
      aria-label="Loading"
      className={className}
      style={{ width: size, height: size }}
    >
      <span className="spinner" />
      <style jsx>{`
        .spinner {
          display: block;
          width: 100%;
          height: 100%;
          border: ${stroke}px solid currentColor;
          border-top-color: transparent;
          border-radius: 9999px;
          animation: spinner-rotate 0.9s linear infinite;
        }
        @keyframes spinner-rotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Spinner;
