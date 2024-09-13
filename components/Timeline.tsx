import TimelineSection from '@/components/TimelineSection';
import { Transaction } from '@/types';
import Fuse from 'fuse.js';

type TimelineProps = {
  blocks: { date: string; expenses: Transaction[]; incomes: Transaction[] }[];
  selectedLabels: string[];
  searchTerm: string;
  transactionType: 'all' | 'income' | 'expense';
  minAmount: number;
  maxAmount: number;
};

const Timeline: React.FC<TimelineProps> = ({
  blocks,
  selectedLabels,
  searchTerm,
  transactionType,
  minAmount,
  maxAmount,
}) => {
  const filterTransactions = (transactions: Transaction[]) => {
    const fuse = new Fuse(transactions, {
      keys: ['description', 'title', 'sender', 'receiver'],
      threshold: 0.4,
      includeScore: true,
    });

    const filteredTransactions = transactions.filter(
      (t) =>
        (selectedLabels.length === 0 || t.labels.some((label) => selectedLabels.includes(label))) &&
        t.amount >= minAmount &&
        t.amount <= maxAmount,
    );

    if (searchTerm === '') {
      return filteredTransactions;
    }

    const fuseResults = fuse.search(searchTerm);
    return fuseResults.map((result) => result.item).filter((t) => filteredTransactions.includes(t));
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ul className="timeline timeline-snap-icon max-md:timeline-compact timeline-vertical">
      {blocks.map(({ date, expenses, incomes }) => {
        const filteredIncomes = transactionType === 'expense' ? [] : filterTransactions(incomes);
        const filteredExpenses = transactionType === 'income' ? [] : filterTransactions(expenses);

        if (filteredIncomes.length === 0 && filteredExpenses.length === 0) return null;

        return (
          <li key={date} data-date={date}>
            <hr />
            <div className="timeline-middle">
              <time className="font-mono text-gray-500 italic block mb-1 mx-2">
                {formatDate(date)}
              </time>
            </div>
            {transactionType !== 'expense' && (
              <TimelineSection transactions={filteredIncomes} isIncome={true} />
            )}
            {transactionType !== 'income' && (
              <TimelineSection transactions={filteredExpenses} isIncome={false} />
            )}
            <hr className="my-8" />
          </li>
        );
      })}
    </ul>
  );
};

export default Timeline;
