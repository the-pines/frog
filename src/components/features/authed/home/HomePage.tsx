import Card from './Card';
import Portfolio from './Portfolio';
import RecentTransactions from './RecentTransactions';

const HomePage: React.FC = () => {
  const exampleCard = {
    cardholderName: 'Frog User',
    cardNumber: '4242 4242 4242 4242', // Visa test number
    expiry: '12/29',
    cvc: '123',
    // masked: true, // optional (default true). Set to false to show full number on front.
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <Card
        cardholderName={exampleCard.cardholderName}
        cardNumber={exampleCard.cardNumber}
        expiry={exampleCard.expiry}
        cvc={exampleCard.cvc}
        className="mx-auto mb-6"
      />

      <Portfolio />

      <RecentTransactions />
    </div>
  );
};

export default HomePage;
