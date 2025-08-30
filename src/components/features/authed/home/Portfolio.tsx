'use client';

import { useQueryTokenBalance } from '@/hooks/useQueryTokenBalance';
import { useAppKitAccount } from '@reown/appkit/react';
import { LISK_USDC_ADDRESS } from '@/config/constants/addresses';
import { useQueryNativeBalance } from '@/hooks/useQueryNativeBalance';
import { useMemo } from 'react';

const Portfolio: React.FC = () => {
  const { address } = useAppKitAccount();
  const userAddress = address as `0x${string}`;

  const { data: nativeBalance, loading: nativeBalanceLoading } =
    useQueryNativeBalance(userAddress);
  const { data: usdcBalance, loading: usdcBalanceLoading } =
    useQueryTokenBalance({
      owner: userAddress,
      token: { address: LISK_USDC_ADDRESS },
    });

  console.log(nativeBalance?.formatted);
  console.log(usdcBalance?.formatted);

  const balancesLoading = useMemo(() => {
    if (!nativeBalanceLoading && !usdcBalanceLoading) {
      return false;
    }
    return true;
  }, [nativeBalanceLoading, usdcBalanceLoading]);

  return <div className="h-[100px] border border-red-200">portfolio</div>;
};

export default Portfolio;
