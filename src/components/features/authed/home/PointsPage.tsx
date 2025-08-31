'use client';

import { useMemo, useCallback } from 'react';
import { formatUnits, type Address } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { useAppKitAccount } from '@reown/appkit/react';

type LeaderItem = { address: Address; points: string };

function useQueryPoints(address?: Address) {
  const enabled = Boolean(address);
  const query = useQuery({
    enabled,
    queryKey: ['points', address],
    queryFn: async () => {
      const params = new URLSearchParams({
        address: address as string,
        limit: '20',
      });
      const resp = await fetch(
        `/api/blockchain/get-points?${params.toString()}`
      );
      if (!resp.ok) throw new Error('failed');
      return (await resp.json()) as {
        ok: boolean;
        balance: string;
        decimals: number;
        symbol: string;
        leaderboard: LeaderItem[];
      };
    },
    refetchOnWindowFocus: true,
  });
  return {
    data: query.data,
    loading: query.isPending,
    fetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}

function useEnsNames(addresses: readonly Address[] | undefined) {
  const list = addresses ?? [];
  return useQuery({
    queryKey: ['ens-names', list],
    enabled: list.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const results = await Promise.all(
        list.map(async (addr) => {
          const addrStr = String(addr);
          try {
            const r = await fetch(
              `https://api.ensideas.com/ens/resolve/${addrStr}`
            );
            if (r.ok) {
              const j = (await r.json()) as {
                name?: string | null;
                displayName?: string | null;
              };
              const n = j?.name || j?.displayName || null;
              if (n) return [addr, n] as const;
            }
          } catch {}

          try {
            const r2 = await fetch(
              `https://api.web3.bio/profile/evm/${addrStr}`
            );
            if (r2.ok) {
              const txt = await r2.text();
              let n2: string | null = null;
              try {
                const j2 = JSON.parse(txt) as
                  | { primaryDomain?: { name?: string } }
                  | { name?: string }
                  | { domains?: Array<{ name?: string }> }
                  | null;
                n2 =
                  (j2 as { primaryDomain?: { name?: string } })?.primaryDomain
                    ?.name ??
                  (j2 as { name?: string })?.name ??
                  (Array.isArray(
                    (j2 as { domains?: Array<{ name?: string }> })?.domains
                  )
                    ? (j2 as { domains?: Array<{ name?: string }> })!
                        .domains!.map((d) => d?.name)
                        .filter((s): s is string => Boolean(s))
                        .filter((s) => /\.eth$/i.test(s))
                        .sort((a, b) => a.length - b.length)[0] ?? null
                    : null);
              } catch {
                const matches = txt.match(/"name"\s*:\s*"([a-z0-9-]+\.eth)"/gi);
                if (matches && matches.length) {
                  const cleaned = matches
                    .map((m) => m.replace(/.*:\s*"|"/g, ''))
                    .sort((a, b) => a.length - b.length)[0];
                  n2 = cleaned ?? null;
                }
              }
              if (n2) return [addr, n2] as const;
            }
          } catch {}

          return [addr, null] as const;
        })
      );
      const map = new Map<Address, string>();
      for (const [a, n] of results) {
        if (n) map.set(a, n);
      }
      return map;
    },
  });
}

const PointsPage: React.FC = () => {
  const { address } = useAppKitAccount();
  const userAddress = address as Address | undefined;

  const { data, loading } = useQueryPoints(userAddress);

  const formatted = useMemo(() => {
    if (!data) return '0';
    return formatUnits(BigInt(data.balance), data.decimals);
  }, [data]);

  const getEmojiForRank = (rank: number) => {
    if (rank === 1) return '🐸';
    if (rank === 2) return '🐢';
    if (rank === 3) return '🦎';
    return '';
  };

  const top10Addresses = (data?.leaderboard ?? [])
    .slice(0, 10)
    .map((e) => e.address);
  const ensNames = useEnsNames(top10Addresses as Address[]);

  const labelFor = useCallback(
    (addr: Address) =>
      ensNames.data?.get(addr) ?? `${addr.slice(0, 6)}…${addr.slice(-4)}`,
    [ensNames.data]
  );
  const youIndex =
    data?.leaderboard?.findIndex(
      (e) => e.address.toLowerCase() === (userAddress ?? '').toLowerCase()
    ) ?? -1;
  const yourRank = youIndex >= 0 ? youIndex + 1 : null;

  return (
    <div className="relative mx-auto w-full max-w-[393px] px-4 pt-16 pb-12 flex flex-col gap-8">
      {/* Top highlight and bottom vignette for contrast */}
      <div className="pointer-events-none absolute -top-6 left-0 right-0 h-36 bg-gradient-to-b from-white/25 via-white/0 to-transparent blur-xl"></div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/25 via-black/0 to-transparent"></div>
      {/* Subtle grain overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-10 mix-blend-overlay [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.08)_0,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_2px),repeating-linear-gradient(90deg,rgba(0,0,0,0.06)_0,rgba(0,0,0,0.06)_1px,transparent_1px,transparent_2px)]"></div>

      {/* Header card with hierarchy */}
      <div className="relative overflow-hidden rounded-3xl backdrop-blur-md bg-[rgba(0,0,0,0.28)] ring-1 ring-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.22)] px-6 py-8 text-center">
        <div className="text-[11px] uppercase tracking-wide text-white/70 mb-2">
          your points
        </div>
        <div className="text-7xl leading-none font-extrabold tracking-tight text-white/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
          {loading ? '…' : formatted}
        </div>
        <div className="text-sm text-white/70 mt-2">points</div>
        {yourRank ? (
          <div className="mx-auto mt-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
            You’re #{yourRank}
          </div>
        ) : null}
      </div>

      <div className="flex items-end justify-center gap-10">
        {(() => {
          const top3 = data?.leaderboard?.slice(0, 3) ?? [];
          const order = [1, 0, 2];
          return order
            .filter((i) => i < top3.length)
            .map((i) => {
              const raw = top3[i]!;
              const rank = i + 1;
              const isCenter = rank === 1;
              const size = isCenter ? 'h-24 w-24' : 'h-16 w-16';
              const ring =
                rank === 1
                  ? 'ring-emerald-400'
                  : rank === 2
                  ? 'ring-teal-300'
                  : 'ring-sky-300';
              const emoji = rank === 1 ? '🐸' : rank === 2 ? '🐢' : '🦎';
              const nameOrAddr = labelFor(raw.address as Address);
              const ens = ensNames.data?.get(raw.address as Address);
              return (
                <div
                  key={raw.address}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className={`relative ${size} rounded-full ring-2 ${ring} ring-offset-2 ring-offset-black/40 flex items-center justify-center text-3xl shadow-[0_6px_20px_rgba(0,0,0,0.18)]`}
                  >
                    <span>{emoji}</span>
                    {rank === 1 ? (
                      <div className="absolute -top-4 flex flex-col items-center text-amber-300">
                        <div className="text-lg">⭐️</div>
                        <div className="-mt-1 text-[10px] bg-amber-400 text-black rounded px-1 font-bold">
                          1
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="text-white/90 text-sm">
                    {ens ? (
                      <a
                        href={`https://app.ens.domains/name/${ens}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {nameOrAddr}
                      </a>
                    ) : (
                      <span>{nameOrAddr}</span>
                    )}
                  </div>
                </div>
              );
            });
        })()}
      </div>

      <div className="overflow-hidden rounded-3xl backdrop-blur-md bg-[rgba(0,0,0,0.28)] ring-1 ring-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col mt-1">
          {data?.leaderboard?.length ? (
            data.leaderboard.slice(3, 10).map((item, idx) => {
              const rank = idx + 4;
              const isYou =
                (userAddress ?? '').toLowerCase() ===
                item.address.toLowerCase();
              const emoji = getEmojiForRank(rank);
              return (
                <div
                  key={item.address}
                  className={`grid grid-cols-[24px_32px_1fr_auto] items-center gap-3 px-4 py-2 odd:bg-white/5 ${
                    isYou ? 'border-l-2 border-emerald-400/80' : ''
                  }`}
                >
                  <div className="text-white/60 text-right tabular-nums">
                    {rank}
                  </div>
                  <div className="h-8 w-8 rounded-full ring-2 ring-white/25 ring-offset-2 ring-offset-black/40 flex items-center justify-center text-lg">
                    {emoji || '👤'}
                  </div>
                  <div
                    className={`text-white/90 ${isYou ? 'font-semibold' : ''}`}
                  >
                    {labelFor(item.address as Address)}
                    {isYou ? (
                      <span className="ml-2 align-middle inline-flex items-center rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] text-white/85 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
                        you
                      </span>
                    ) : null}
                  </div>
                  <div className="text-right font-mono tabular-nums text-white/90">
                    {formatUnits(BigInt(item.points), data?.decimals ?? 18)}
                    <span className="ml-1 text-white/60">points</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-[#C8D1DA]">No leaderboard data yet.</div>
          )}
        </div>

        {youIndex < 0 ? (
          <div className="px-4 pb-3 text-xs text-white/70">
            you’re outside the top 10 — keep going!
          </div>
        ) : null}
        {youIndex >= 10 ? (
          <div className="px-4 pb-4">
            <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs text-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
              Your current rank: #{youIndex + 1}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl backdrop-blur-md bg-[rgba(255,255,255,0.18)] ring-1 ring-black/10 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
        <div className="px-5 pt-4 text-sm text-[color:var(--foreground)]/90">
          Earn more points!
        </div>
        <ul className="px-7 pb-5 list-disc text-[color:var(--foreground)]/85 space-y-1">
          <li>Make purchases with your card</li>
          <li>Create a savings vault</li>
          <li>Share your savings vault</li>
          <li>Invite friends to try Frog</li>
          <li>Keep an onchain activity streak</li>
        </ul>
      </div>
    </div>
  );
};

export default PointsPage;
