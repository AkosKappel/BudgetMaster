import { useMemo } from 'react';

import Fuse from 'fuse.js';

import TimelineBlock from '@/app/(protected)/history/TimelineBlock';
import { formatDate, groupByDateAndType } from '@/lib/utils';
import type { Transaction } from '@/schemas/transactionSchema';

type TimelineProps = {
  transactions: Transaction[];
  selectedLabels: string[];
  searchTerm: string;
  transactionType: 'all' | 'income' | 'expense';
  minAmount: number;
  maxAmount: number;
  showNoLabels: boolean;
};

const Timeline: React.FC<TimelineProps> = ({
  transactions,
  selectedLabels,
  searchTerm,
  transactionType,
  minAmount,
  maxAmount,
  showNoLabels,
}) => {
  const blocks = useMemo(() => groupByDateAndType(transactions), [transactions]);

  const highlightText = (text: string, highlight: string) => {
    if (!highlight || !highlight.trim()) return text;
    const regex = new RegExp(`(${highlight})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  const filterTransactions = (transactions: Transaction[]) => {
    const filteredTransactions = transactions.filter(
      (t) =>
        ((selectedLabels.length === 0 && !showNoLabels) ||
          (showNoLabels && t.labels.length === 0) ||
          t.labels.some((label) => selectedLabels.includes(label))) &&
        t.amount >= minAmount &&
        t.amount <= maxAmount,
    );

    if (searchTerm === '') return filteredTransactions;

    const fuse = new Fuse(filteredTransactions, {
      keys: ['title', 'category', 'description', 'sender', 'receiver'],
      threshold: 0.4,
      includeScore: true,
    });

    return fuse.search(searchTerm).map((result) => ({
      ...result.item,
      title: highlightText(result.item.title, searchTerm),
      category: highlightText(result.item.category, searchTerm),
      description: highlightText(result.item.description, searchTerm),
      sender: highlightText(result.item.sender, searchTerm),
      receiver: highlightText(result.item.receiver, searchTerm),
    }));
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
              <time className="font-mono text-gray-500 italic block mb-1 mx-2">{formatDate(date)}</time>
            </div>
            {transactionType !== 'expense' && <TimelineBlock transactions={filteredIncomes} isIncome={true} />}
            {transactionType !== 'income' && <TimelineBlock transactions={filteredExpenses} isIncome={false} />}
            <hr className="my-8" />
          </li>
        );
      })}
    </ul>
  );
};

export default Timeline;
