'use client';

import * as React from 'react';
import { useAppKitAccount } from '@reown/appkit/react';
import { LISK_USDC_ADDRESS } from '@/config/constants/addresses';
import { useQueryNativeBalance } from '@/hooks/useQueryNativeBalance';
import { useQueryTokenBalance } from '@/hooks/useQueryTokenBalance';
import { CubeIcon, BanknotesIcon } from '@heroicons/react/24/outline';

type RowProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  amount: string;
  fiat: string;
};

const Row: React.FC<RowProps> = ({ icon, title, subtitle, amount, fiat }) => (
  <li className="flex items-center justify-between p-2">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl grid place-items-center border border-white/10 bg-white/10">
        <span className="text-frog-foreground" aria-hidden>
          {icon}
        </span>
      </div>
      <div className="leading-tight">
        <div className="text-sm font-medium text-frog-foreground">{title}</div>
        <div className="text-[12px] text-frog-muted">{subtitle}</div>
      </div>
    </div>
    <div className="text-right leading-tight">
      <div className="text-sm font-semibold text-frog-foreground font-mono">
        {amount}
      </div>
      <div className="text-[12px] text-frog-muted">{fiat}</div>
    </div>
  </li>
);

const PortfolioSkeleton: React.FC = () => (
  <section
    role="status"
    aria-live="polite"
    aria-busy="true"
    className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4"
  >
    <div className="mb-3">
      <div className="h-5 w-24 skeleton" />
    </div>

    <ul className="space-y-3">
      {[0, 1].map((i) => (
        <li key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="skeleton h-10 w-10 rounded-xl" />
            <div className="space-y-1">
              <div className="skeleton h-4 w-28" />
              <div className="skeleton h-3 w-20" />
            </div>
          </div>
          <div className="space-y-1 text-right">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-3 w-14" />
          </div>
        </li>
      ))}
    </ul>
  </section>
);

const Portfolio: React.FC = () => {
  const { address } = useAppKitAccount();
  const userAddress = '0xdcaa4667bf4a8383d02b2fb95a824778993bb99d';

  const { data: nativeBalance, loading: nativeBalanceLoading } =
    useQueryNativeBalance(userAddress);
  const { data: usdcBalance, loading: usdcBalanceLoading } =
    useQueryTokenBalance({
      owner: userAddress as `0x${string}`,
      token: { address: LISK_USDC_ADDRESS },
    });

  const balancesLoading = nativeBalanceLoading || usdcBalanceLoading;
  if (balancesLoading) return <PortfolioSkeleton />;

  const nativeAmt = nativeBalance?.formattedShort ?? '—';
  const nativeFiat = '—';
  const usdcAmt = usdcBalance?.formattedShort ?? '—';
  const usdcFiat = '—';

  return (
    <section className="frog-glass supports-[backdrop-filter]:backdrop-blur-xl rounded-2xl border border-white/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-frog-muted">Portfolio</h2>
      </div>

      <ul className="space-y-3">
        <Row
          icon={<CubeIcon className="h-4 w-4" />}
          title="ETH"
          subtitle="Native"
          amount={String(nativeAmt)}
          fiat={String(nativeFiat)}
        />
        <Row
          icon={<BanknotesIcon className="h-4 w-4" />}
          title="USDC"
          subtitle="Stablecoin"
          amount={String(usdcAmt)}
          fiat={String(usdcFiat)}
        />
      </ul>
    </section>
  );
};

export default Portfolio;
