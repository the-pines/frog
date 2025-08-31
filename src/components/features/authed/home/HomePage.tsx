'use client';

import Card from './Card';
import Portfolio from './Portfolio';
import RecentTransactions from './RecentTransactions';
import { useAppKitAccount } from '@reown/appkit/react';
import { useGetUserDetails } from '@/hooks/useGetUserDetails';

const HomePage: React.FC = () => {
  const { address } = useAppKitAccount();
  const userAddress = address as `0x${string}`;
  const { data, loading, error } = useGetUserDetails(userAddress);

  const cardholderName = data?.user.card.displayName ?? '';
  const cardNumber = data?.user.card.number ?? '';
  const expiry = data?.user.card.expiry ?? '';
  const cvc = data?.user.card.cvc ?? '';

  return (
    <div className="flex flex-col gap-4 h-full">
      <Card
        cardholderName={cardholderName}
        cardNumber={cardNumber}
        expiry={expiry}
        cvc={cvc}
        className="mx-auto mb-6"
      />

      <Portfolio />

      <RecentTransactions />
    </div>
  );
};

export default HomePage;
