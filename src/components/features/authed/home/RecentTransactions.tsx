'use client';

import { useQueryTransactions } from '@/hooks/useQueryTransactions';
import { useAppKitAccount } from '@reown/appkit/react';

const RecentTransactions: React.FC = () => {
  const { address } = useAppKitAccount();
  const userAddress = address as `0x${string}`;

  const { data, loading } = useQueryTransactions({
    address: '0xDCaa4667Bf4a8383D02B2Fb95a824778993BB99D',
    all: true,
    limit: 25,
    offset: 0,
  });

  return (
    <div className="h-[100px] border border-red-200">recent transactions</div>
  );
};

export default RecentTransactions;
