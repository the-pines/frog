'use client';

import * as React from 'react';
import Link from 'next/link';
import { isAddress } from 'viem';
import { useAppKitAccount } from '@reown/appkit/react';
import Spinner from '@/components/ui/Spinner';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const ConfettiBurst = dynamic(
  () => import('@/components/ui/Confetti').then((m) => m.ConfettiBurst),
  { ssr: false }
);

export default function NewVaultPage() {
  const [mode, setMode] = React.useState<'create' | 'attach'>('create');
  const [name, setName] = React.useState('My Vault');
  const [goalUsd, setGoalUsd] = React.useState('0');
  const [address, setAddress] = React.useState('');
  const { address: owner } = useAppKitAccount();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [burstKey, setBurstKey] = React.useState(0);
  const router = useRouter();

  return (
    <div className="px-4 space-y-4">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-background/70 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link
          href="/vaults"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 h-9 hover:bg-white/5 text-sm"
        >
          <span aria-hidden>←</span> Back
        </Link>
      </div>
      <div className="text-lg font-semibold text-frog-foreground">
        Add New Vault
      </div>

      <div className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm">
          <button
            className={`rounded-full border border-white/10 px-4 h-8 ${
              mode === 'create' ? 'bg-white/5' : ''
            }`}
            onClick={() => setMode('create')}
          >
            Create new
          </button>
          <button
            className={`rounded-full border border-white/10 px-4 h-8 ${
              mode === 'attach' ? 'bg-white/5' : ''
            }`}
            onClick={() => setMode('attach')}
          >
            Paste contract
          </button>
        </div>

        {mode === 'create' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-frog-muted">Name</span>
                <input
                  className="rounded-md border border-white/10 bg-transparent px-3 h-10"
                  placeholder="My Vault"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-frog-muted">Goal (USD)</span>
                <input
                  className="rounded-md border border-white/10 bg-transparent px-3 h-10"
                  placeholder="0"
                  value={goalUsd}
                  onChange={(e) => setGoalUsd(e.target.value)}
                />
              </label>
            </div>
            <button
              className="rounded-full border border-white/10 px-4 h-10 hover:bg-white/5 inline-flex items-center gap-2 disabled:opacity-50"
              disabled={submitting}
              onClick={async () => {
                try {
                  setError('');
                  setSuccess('');
                  setSubmitting(true);
                  // Convert USD to wstETH wei using hardcoded price (frontend only)
                  const usdcMinor = BigInt(
                    Math.floor(Number(goalUsd || '0') * 1_000_000)
                  );
                  const PRICE_MICRO_USDC_PER_WST = BigInt(5_391_940_000);
                  const goalWei =
                    (usdcMinor * BigInt(10) ** BigInt(18)) /
                    PRICE_MICRO_USDC_PER_WST;

                  const res = await fetch('/api/vaults/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      owner,
                      goalWei: goalWei.toString(),
                      name,
                    }),
                  });
                  if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    setError(j?.error || 'Failed to create vault');
                  } else {
                    setSuccess('Vault created');
                    setGoalUsd('0');
                    setBurstKey((n) => n + 1);
                    // Notify parent (overlay) to close and refresh
                    try {
                      if (typeof window !== 'undefined' && window.parent) {
                        window.parent.postMessage(
                          { type: 'vault-created' },
                          '*'
                        );
                      }
                    } catch {}
                    // If not embedded, navigate back after a short celebration
                    if (
                      typeof window !== 'undefined' &&
                      window.parent === window
                    ) {
                      setTimeout(() => router.push('/vaults'), 900);
                    }
                  }
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? (
                <>
                  <Spinner size={14} /> Creating…
                </>
              ) : (
                'Create Vault'
              )}
            </button>
            {(error || success) && (
              <div className="text-sm">
                {error && <div className="text-red-500">{error}</div>}
                {success && <div className="text-green-500">{success}</div>}
              </div>
            )}
            {/* Celebration overlay */}
            <div className="relative">
              <ConfettiBurst burstKey={burstKey} />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-frog-muted">Vault contract address</span>
              <input
                className="rounded-md border border-white/10 bg-transparent px-3 h-10 w-full"
                placeholder="0x..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
            <button
              className="rounded-full border border-white/10 px-4 h-10 hover:bg-white/5 disabled:opacity-50"
              disabled={!isAddress(address)}
              onClick={async () => {
                const res = await fetch('/api/vaults/attach', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ owner, address, name }),
                });
                if (!res.ok) {
                  const j = await res.json().catch(() => ({}));
                  alert(j?.error || 'Failed to attach vault');
                } else {
                  alert('Vault attached');
                }
              }}
            >
              Attach Existing
            </button>
            <div className="text-xs text-frog-muted">
              You can contribute to attached vaults but cannot withdraw unless
              you are the owner.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
