'use client';

import * as React from 'react';
import Link from 'next/link';
import { wstWeiToUsdString } from '@/lib/wstEthUsd';
import ProgressCircle from '@/components/ui/ProgressCircle';

export interface VaultCardData {
  id: `0x${string}`;
  name: string;
  goalWei: string;
  totalWei: string;
  token: { symbol: string; decimals: number };
}

export const VaultCard: React.FC<
  { data: VaultCardData } & { href?: string }
> = ({ data, href }) => {
  const goal = BigInt(data.goalWei || '0');
  const total = BigInt(data.totalWei || '0');
  const pct =
    goal > BigInt(0) ? Number((total * BigInt(10000)) / goal) / 100 : 0;
  const overGoal = total > goal;

  const content = (
    <div className="relative frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4 transition-colors hover:bg-white/5">
      {overGoal && (
        <span className="absolute right-2 top-2 text-base" aria-hidden>
          🎉
        </span>
      )}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <ProgressCircle size={56} percent={pct} idSuffix={data.id} />
          <span className="absolute -right-1 -bottom-1 text-[13px]" aria-hidden>
            {overGoal ? '🎉' : pct >= 66 ? '🚀' : pct >= 33 ? '✨' : '🌱'}
          </span>
        </div>
        <div className="flex flex-col min-w-0">
          <div
            className="font-semibold leading-tight text-frog-foreground truncate"
            title={data.name}
          >
            {data.name}
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
        <div className="text-frog-muted">In vault</div>
        <div className="text-frog-foreground">
          {wstWeiToUsdString(total, data.token.decimals)}
        </div>
        <div className="text-frog-muted">Goal</div>
        <div className="text-frog-foreground">
          {wstWeiToUsdString(goal, data.token.decimals)}
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
};

export default VaultCard;
