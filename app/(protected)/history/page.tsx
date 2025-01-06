'use client';

import { useCallback, useRef, useState } from 'react';

import { CalendarIcon } from '@heroicons/react/24/solid';

import Filters from '@/app/(protected)/history/Filters';
import Timeline from '@/app/(protected)/history/Timeline';
import BackToTop from '@/components/ui/BackToTop';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useUserTransactions } from '@/hooks/transactions';

const HistoryPage = () => {
  const { data: transactions, isLoading, isError, error, refetch } = useUserTransactions();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [transactionType, setTransactionType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(Infinity);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [showNoLabels, setShowNoLabels] = useState<boolean>(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleDateJump = useCallback(() => {
    if (selectedDate && timelineRef.current) {
      const formattedDate = new Date(selectedDate).toISOString().split('T')[0];
      const dateElements = timelineRef.current.querySelectorAll('[data-date]');
      if (dateElements.length === 0) return;

      let closestDate = dateElements[0];
      let minDiff = Math.abs(
        new Date(closestDate.getAttribute('data-date') || '').getTime() - new Date(formattedDate).getTime(),
      );

      dateElements.forEach((element) => {
        const diff = Math.abs(
          new Date(element.getAttribute('data-date') || '').getTime() - new Date(formattedDate).getTime(),
        );
        if (diff < minDiff) {
          closestDate = element;
          minDiff = diff;
        }
      });

      closestDate.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedDate]);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage message={error.message} onRetry={refetch} />;

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl mb-8 flex items-center">
        <CalendarIcon className="w-8 h-8 mr-2" />
        Transactions History
      </h1>

      <Filters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        transactionType={transactionType}
        setTransactionType={setTransactionType}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        handleDateJump={handleDateJump}
        selectedLabels={selectedLabels}
        setSelectedLabels={setSelectedLabels}
        minAmount={minAmount}
        maxAmount={maxAmount}
        setMinAmount={setMinAmount}
        setMaxAmount={setMaxAmount}
        showNoLabels={showNoLabels}
        setShowNoLabels={setShowNoLabels}
      />
      <div ref={timelineRef}>
        <Timeline
          transactions={transactions || []}
          selectedLabels={selectedLabels}
          searchTerm={searchTerm}
          transactionType={transactionType}
          minAmount={minAmount}
          maxAmount={maxAmount}
          showNoLabels={showNoLabels}
        />
      </div>
      <BackToTop />
    </div>
  );
};

export default HistoryPage;
