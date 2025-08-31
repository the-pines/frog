'use client';

import { useAppKitAccount } from '@reown/appkit/react';
import {
  Transaction,
  useQueryTransactions,
} from '@/hooks/useQueryTransactions';
import type { Address } from 'viem';

import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useRef, useState } from 'react';

const LIMIT = 25;

const explorerUrl = (hash: string) => `https://blockscout.lisk.com/tx/${hash}`;

function formatRelative(ts: number) {
  const ms = ts > 1e12 ? ts : ts * 1000;
  const diff = Date.now() - ms;
  const s = Math.max(1, Math.floor(diff / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function InitialSkeleton() {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-frog-muted">Transactions</div>
        <div className="skeleton h-5 w-16" />
      </div>
      <ul className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <li key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="space-y-1">
                <div className="skeleton h-4 w-28" />
                <div className="skeleton h-3 w-20" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-6 w-6 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LoadingMoreSkeleton() {
  return (
    <ul className="mt-3 space-y-3" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 rounded-xl" />
            <div className="space-y-1">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-6 w-6 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function TxRow({ tx }: { tx: Transaction }) {
  const inbound = tx.direction === 'in';
  const symbol =
    tx.tokenSymbol?.split('.')[0] ?? (tx.kind === 'native' ? 'ETH' : 'TOKEN');
  const amount = `${inbound ? '+' : '−'}${tx.formattedShort} ${symbol}`;

  return (
    <li>
      <a
        href={explorerUrl(tx.hash)}
        target="_blank"
        rel="noopener noreferrer"
        title="Open transaction in Blockscout"
        aria-label={`Open ${
          inbound ? 'received' : 'sent'
        } ${symbol} transaction in Blockscout`}
        className="group flex items-center justify-between rounded-xl px-2 py-2
                   transition-colors hover:bg-white/5 active:bg-white/10
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-frog-active/80"
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-xl grid place-items-center border border-white/10
                        ${
                          inbound
                            ? 'text-frog-active bg-frog-active/12'
                            : 'text-frog-foreground bg-white/10'
                        }`}
            aria-hidden
          >
            {inbound ? (
              <ArrowDownLeftIcon className="h-4 w-4" />
            ) : (
              <ArrowUpRightIcon className="h-4 w-4" />
            )}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-medium text-frog-foreground">
              {inbound ? 'Received' : 'Sent'} {symbol}
            </div>
            <div className="text-[12px] text-frog-muted">
              {formatRelative(tx.timeStamp)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-right">
          <div
            className={`text-sm font-semibold ${
              inbound ? 'text-frog-active' : 'text-frog-foreground'
            }`}
          >
            {amount}
          </div>
          <span
            aria-hidden
            title="View on Blockscout"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10
                       text-frog-foreground/80 transition-transform duration-150
                       group-hover:scale-110 group-hover:text-frog-foreground"
          >
            <EyeIcon className="h-4 w-4" />
          </span>
        </div>
      </a>
    </li>
  );
}

export default function Transactions() {
  const { address } = useAppKitAccount();
  const queryAddress = '0xDCaa4667Bf4a8383D02B2Fb95a824778993BB99D' as Address;

  const [offset, setOffset] = useState(0);
  const [pages, setPages] = useState<Transaction[][]>([]);
  const lastAppliedOffset = useRef(-1);

  const { data, loading } = useQueryTransactions({
    address: queryAddress,
    all: true,
    limit: LIMIT,
    offset,
  });

  useEffect(() => {
    setOffset(0);
    setPages([]);
    lastAppliedOffset.current = -1;
  }, [queryAddress]);

  useEffect(() => {
    if (!loading && data && offset !== lastAppliedOffset.current) {
      setPages((prev) => [...prev, (data as Transaction[]) ?? []]);
      lastAppliedOffset.current = offset;
    }
  }, [loading, data, offset]);

  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: Transaction[] = [];
    for (const page of pages) {
      for (const tx of page || []) {
        if (tx && !seen.has(tx.hash)) {
          seen.add(tx.hash);
          out.push(tx);
        }
      }
    }
    return out;
  }, [pages]);

  const lastPage = pages[pages.length - 1] ?? [];
  const hasMore = lastPage.length === LIMIT;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loading) {
          setOffset((prev) => prev + LIMIT);
        }
      },
      { rootMargin: '400px 0px 0px 0px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, items.length]);

  if (items.length === 0 && loading) return <InitialSkeleton />;

  return (
    <section className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-frog-muted">Transactions</h2>
      </div>

      {items.length ? (
        <>
          <ul className="space-y-3">
            {items.map((tx) => (
              <TxRow key={tx.hash} tx={tx} />
            ))}
          </ul>

          <div ref={sentinelRef} />
          {loading && <LoadingMoreSkeleton />}

          {!hasMore && !loading && (
            <div className="mt-4 text-[12px] text-frog-muted text-center">
              You’re all caught up.
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-frog-muted/90">No transactions yet.</div>
      )}
    </section>
  );
}
