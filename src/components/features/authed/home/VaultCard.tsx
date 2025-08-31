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
    <div className="relative rounded-xl border border-black/[.08] dark:border-white/[.145] p-4 hover:bg-black/[.02] dark:hover:bg-white/[.04] transition-colors">
      {overGoal && (
        <span className="absolute right-2 top-2 text-base" aria-hidden>
          🎉
        </span>
      )}
      <div className="flex items-center gap-3">
        <div className="relative">
          <ProgressCircle size={56} percent={pct} idSuffix={data.id} />
          <span className="absolute -right-1 -bottom-1 text-[13px]" aria-hidden>
            {overGoal ? '🎉' : pct >= 66 ? '🚀' : pct >= 33 ? '✨' : '🌱'}
          </span>
        </div>
        <div className="flex flex-col">
          <div className="font-semibold leading-tight">{data.name}</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
        <div className="opacity-70">In vault</div>
        <div>{wstWeiToUsdString(total, data.token.decimals)}</div>
        <div className="opacity-70">Goal</div>
        <div>{wstWeiToUsdString(goal, data.token.decimals)}</div>
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
