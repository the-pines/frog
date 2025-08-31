'use client';

import { useMemo, useCallback } from 'react';
import { formatUnits, type Address } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { useAppKitAccount } from '@reown/appkit/react';

type LeaderItem = { address: Address; points: string };

function formatTwoDecimalsFromUnits(value: bigint, decimals: number): string {
  const full = formatUnits(value, decimals);
  const [int, dec] = full.split('.');
  return dec ? `${int}.${dec.slice(0, 2)}` : int;
}

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
    return formatTwoDecimalsFromUnits(BigInt(data.balance), data.decimals);
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
    <div className="relative mx-auto w-full max-w-[393px] px-4 pt-8 pb-12 flex flex-col gap-5">
      <div className="frog-glass frog-glass--light supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 px-6 py-8 text-center">
        <div className="text-[11px] uppercase tracking-wide text-frog-muted mb-2">
          My points
        </div>
        <div
          className="text-7xl leading-none font-extrabold tracking-tight bg-clip-text text-transparent font-display"
          style={{
            backgroundImage:
              'linear-gradient(120deg, var(--color-grad-1), var(--color-grad-2), var(--color-grad-3))',
          }}
        >
          {loading ? '…' : formatted}
        </div>
        <div className="text-sm text-frog-foreground/80 mt-2">points</div>
        {yourRank ? (
          <div className="mx-auto mt-3 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-frog-foreground/90">
            Rank #{yourRank}
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

      {loading ? (
        <section
          role="status"
          aria-busy="true"
          className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4"
        >
          <div className="mb-3">
            <div className="h-5 w-28 skeleton" />
          </div>
          <ul className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="rounded-xl p-2">
                <div className="grid grid-cols-[24px_32px_1fr_auto] items-center gap-3">
                  <div className="h-4 w-6 skeleton" />
                  <div className="h-8 w-8 rounded-full skeleton" />
                  <div className="h-4 w-40 skeleton" />
                  <div className="h-4 w-16 skeleton" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4 overflow-hidden">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-frog-muted">Leaderboard</h2>
          </div>
          <ul className="space-y-1">
            {data?.leaderboard?.length ? (
              data.leaderboard.slice(3, 10).map((item, idx) => {
                const rank = idx + 4;
                const isYou =
                  (userAddress ?? '').toLowerCase() ===
                  item.address.toLowerCase();
                const emoji = getEmojiForRank(rank);
                return (
                  <li
                    key={item.address}
                    className="rounded-xl hover:bg-white/5"
                  >
                    <div
                      className={`grid grid-cols-[24px_32px_1fr_auto] items-center gap-3 p-2 ${
                        isYou ? 'border-l-2 border-emerald-400/80 pl-3' : ''
                      }`}
                    >
                      <div className="text-frog-muted text-right tabular-nums">
                        {rank}
                      </div>
                      <div className="h-8 w-8 rounded-full ring-2 ring-white/10 flex items-center justify-center text-lg">
                        {emoji || '👤'}
                      </div>
                      <div
                        className={`text-frog-foreground ${
                          isYou ? 'font-semibold' : ''
                        }`}
                      >
                        {labelFor(item.address as Address)}
                        {isYou ? (
                          <span className="ml-2 align-middle inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-frog-foreground/85">
                            you
                          </span>
                        ) : null}
                      </div>
                      <div className="text-right font-mono tabular-nums text-frog-foreground">
                        {formatTwoDecimalsFromUnits(
                          BigInt(item.points),
                          data?.decimals ?? 18
                        )}
                        <span className="ml-1 text-frog-muted">points</span>
                      </div>
                    </div>
                  </li>
                );
              })
            ) : (
              <li className="py-2 text-frog-muted">No leaderboard data yet.</li>
            )}
          </ul>

          {youIndex < 0 ? (
            <div className="px-2 pt-2 text-xs text-frog-muted">
              you’re outside the top 10 — keep going!
            </div>
          ) : null}
          {youIndex >= 10 ? (
            <div className="px-2 pt-2">
              <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-frog-foreground/90">
                Your current rank: #{youIndex + 1}
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
};

export default PointsPage;
