'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAppKitAccount } from '@reown/appkit/react';
import ProgressCircle from '@/components/ui/ProgressCircle';
import dynamic from 'next/dynamic';
const ConfettiBurst = dynamic(
  () => import('@/components/ui/Confetti').then((m) => m.ConfettiBurst),
  { ssr: false }
);
import VaultCard, {
  VaultCardData,
} from '@/components/features/authed/home/VaultCard';
import { HIDDEN_VAULT_ADDRESSES } from '@/config/constants/addresses';

async function fetchVaults(owner?: string): Promise<VaultCardData[]> {
  if (!owner) return [];
  const res = await fetch(`/api/vaults?owner=${owner}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.vaults ?? []) as VaultCardData[];
}

export default function Vaults() {
  const { address } = useAppKitAccount();
  const { data: vaults = [], isLoading } = useQuery({
    queryKey: ['vaults', address],
    queryFn: () => fetchVaults(address || undefined),
    enabled: Boolean(address),
  });

  const filteredVaults = React.useMemo(
    () =>
      vaults.filter(
        (v) =>
          !HIDDEN_VAULT_ADDRESSES.includes(v.id.toLowerCase() as `0x${string}`)
      ),
    [vaults]
  );

  const aggregate = React.useMemo(() => {
    let total = BigInt(0);
    let goal = BigInt(0);
    for (const v of filteredVaults) {
      total += BigInt(v.totalWei || '0');
      goal += BigInt(v.goalWei || '0');
    }
    const pct =
      goal > BigInt(0) ? Number((total * BigInt(10000)) / goal) / 100 : 0;
    return { total, goal, pct };
  }, [filteredVaults]);

  const [burstKey, setBurstKey] = React.useState(0);

  React.useEffect(() => {
    if (aggregate.pct >= 100) setBurstKey((n) => n + 1);
  }, [aggregate.pct]);

  return (
    <div className="px-4">
      <div className="relative flex flex-col items-center justify-center gap-2 mt-2">
        <ProgressCircle
          size={148}
          stroke={14}
          percent={aggregate.pct}
          label="Progress"
        />
        <div className="text-sm font-semibold text-frog-foreground">
          {Math.round(aggregate.pct)}%
        </div>
        <ConfettiBurst burstKey={burstKey} className="pointer-events-none" />
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-medium text-frog-muted">My Vaults</h2>
          <Link
            href="/vaults/new"
            className="rounded-full border border-white/10 px-3 h-8 text-[13px] inline-flex items-center gap-2 hover:bg-white/5"
          >
            + New
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {isLoading && (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4 animate-pulse"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full skeleton" />
                    <div className="flex-1">
                      <div className="h-4 w-32 skeleton rounded mb-2" />
                      <div className="h-3 w-24 skeleton rounded" />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                    <div className="h-3 w-12 skeleton rounded" />
                    <div className="h-3 w-24 skeleton rounded" />
                    <div className="h-3 w-12 skeleton rounded" />
                    <div className="h-3 w-24 skeleton rounded" />
                  </div>
                </div>
              ))}
            </>
          )}
          {!isLoading && filteredVaults.length === 0 && (
            <div className="text-sm text-frog-muted">No vaults yet.</div>
          )}
          {filteredVaults.map((v) => (
            <VaultCard key={v.id} data={v} href={`/vaults/${v.id}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
