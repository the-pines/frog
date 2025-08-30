import Card from './Card';
import Portfolio from './Portfolio';
import RecentTransactions from './RecentTransactions';

const HomePage: React.FC = () => {
  return (
    <div className="flex flex-col gap-10 h-full border border-blue-200">
      <Card />
      <Portfolio />
      <RecentTransactions />
    </div>
  );
};

export default HomePage;
