'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import axios from 'axios';

import BackToTop from '@/components/BackToTop';
import Filters from '@/components/Filters';
import LoadingSpinner from '@/components/LoadingSpinner';
import Timeline from '@/components/Timeline';
import { groupByDateAndType } from '@/lib/utils';
import { RootState } from '@/store';
import { setTransactions } from '@/store/transactionsSlice';

const TransactionsPage: React.FC = () => {
  const transactions = useSelector((state: RootState) => state.transactions.items);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [transactionType, setTransactionType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const timelineRef = useRef<HTMLDivElement>(null);
  const [showNoLabels, setShowNoLabels] = useState<boolean>(false);
  const [minAmount, setMinAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(Infinity);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/transactions');
      dispatch(setTransactions(response.data));
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to fetch transactions. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const transactionsByDateAndType = useMemo(
    () => groupByDateAndType('date', transactions),
    [transactions],
  );
  const allLabels = useMemo(
    () => Array.from(new Set(transactions.flatMap((t) => t.labels))),
    [transactions],
  );

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
      <Filters
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
        minAmount={minAmount}
        maxAmount={maxAmount}
        setMinAmount={setMinAmount}
        setMaxAmount={setMaxAmount}
        showNoLabels={showNoLabels}
        setShowNoLabels={setShowNoLabels}
      />
      <div ref={timelineRef}>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="text-red-500 text-center">{error}</div>
        ) : (
          <Timeline
            blocks={transactionsByDateAndType}
            selectedLabels={selectedLabels}
            searchTerm={searchTerm}
            transactionType={transactionType}
            minAmount={minAmount}
            maxAmount={maxAmount}
            showNoLabels={showNoLabels}
          />
        )}
      </div>
      <BackToTop />
    </div>
  );
};

export default TransactionsPage;
