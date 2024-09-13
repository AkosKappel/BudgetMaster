'use client';

import { useCallback, useRef, useState } from 'react';

import BackToTop from '@/components/BackToTop';
import Timeline from '@/components/Timeline';
import TransactionFilters from '@/components/TransactionFilters';
import { transactions, transactionsByDateAndType } from '@/types';

const TransactionsPage: React.FC = () => {
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [transactionType, setTransactionType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const timelineRef = useRef<HTMLDivElement>(null);

  const allLabels = Array.from(new Set(transactions.flatMap((t) => t.labels)));

  const handleLabelToggle = (label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

  const handleDateJump = useCallback(() => {
    if (selectedDate && timelineRef.current) {
      const formattedDate = new Date(selectedDate).toISOString().split('T')[0];
      const dateElements = timelineRef.current.querySelectorAll('[data-date]');
      if (dateElements.length > 0) {
        let closestDate = dateElements[0];
        let minDiff = Math.abs(
          new Date(closestDate.getAttribute('data-date') || '').getTime() -
            new Date(formattedDate).getTime(),
        );

        dateElements.forEach((element) => {
          const diff = Math.abs(
            new Date(element.getAttribute('data-date') || '').getTime() -
              new Date(formattedDate).getTime(),
          );
          if (diff < minDiff) {
            closestDate = element;
            minDiff = diff;
          }
        });

        closestDate.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [selectedDate]);

  return (
    <div className="p-2">
      <h2 className="text-2xl font-bold mb-4 text-center">Transactions history</h2>
      <TransactionFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        transactionType={transactionType}
        setTransactionType={setTransactionType}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        handleDateJump={handleDateJump}
        allLabels={allLabels}
        selectedLabels={selectedLabels}
        handleLabelToggle={handleLabelToggle}
        setSelectedLabels={setSelectedLabels}
      />
      <div ref={timelineRef}>
        <Timeline
          blocks={transactionsByDateAndType}
          selectedLabels={selectedLabels}
          searchTerm={searchTerm}
          transactionType={transactionType}
        />
      </div>
      <BackToTop />
    </div>
  );
};

export default TransactionsPage;
