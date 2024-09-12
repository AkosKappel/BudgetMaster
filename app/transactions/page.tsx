import AddTransaction from '@/components/AddTransaction';
import Timeline from '@/components/Timeline';
import { Transaction, transactionsByDateAndType } from '@/types';

type TransactionsPageProps = {
  transactions: Transaction[];
};

const TransactionsPage: React.FC<TransactionsPageProps> = (props) => {
  return (
    <div className="p-2">
      <h1 className="text-2xl font-bold mb-4 text-center">Transactions history</h1>
      <Timeline blocks={transactionsByDateAndType} />
      <AddTransaction />
    </div>
  );
};

export default TransactionsPage;
