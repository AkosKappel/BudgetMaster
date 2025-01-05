'use client';

import React, { useMemo } from 'react';

import { ChartPieIcon } from '@heroicons/react/24/solid';

import {
  CumulativeChart,
  MixedBarChart,
  MonthlyIncomeExpenseChart,
  MonthlyTrendChart,
  PieChartDiagram,
  VerticalBarChart,
} from '@/components/charts';
import ErrorMessage from '@/components/ui/ErrorMessage';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useFetchTransactions } from '@/hooks/useTransactions';

const StatsPage = () => {
  const { transactions, loading, error, refetch } = useFetchTransactions();

  const { totalIncome, totalExpense, monthlyAggregatedData } = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const monthlyAggregatedData: Record<string, { income: number; expense: number }> = {};

    transactions.forEach((t) => {
      if (t.isExpense) {
        totalExpense += t.amount;
      } else {
        totalIncome += t.amount;
      }

      const date = new Date(t.date);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      if (!monthlyAggregatedData[monthYear]) {
        monthlyAggregatedData[monthYear] = { income: 0, expense: 0 };
      }
      if (t.isExpense) {
        monthlyAggregatedData[monthYear].expense += t.amount;
      } else {
        monthlyAggregatedData[monthYear].income += t.amount;
      }
    });

    return { totalIncome, totalExpense, monthlyAggregatedData };
  }, [transactions]);

  const monthlyFinanceData = useMemo(() => {
    return Object.entries(monthlyAggregatedData)
      .map(([name, data]) => ({
        name,
        Income: data.income,
        Expense: data.expense,
        Balance: data.income - data.expense,
      }))
      .reverse();
  }, [monthlyAggregatedData]);

  const totalFinanceData = useMemo(() => {
    return [
      { name: 'Income', value: totalIncome },
      { name: 'Expense', value: totalExpense },
    ];
  }, [totalIncome, totalExpense]);

  const labelAggregatedData = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        transaction.labels.forEach((label: string) => {
          if (!acc[label]) acc[label] = { income: 0, expense: 0 };
          if (transaction.isExpense) {
            acc[label].expense += transaction.amount;
          } else {
            acc[label].income += transaction.amount;
          }
        });
        return acc;
      },
      {} as Record<string, { income: number; expense: number }>,
    );
  }, [transactions]);

  const labelIncomeExpenseData = useMemo(() => {
    return Object.entries(labelAggregatedData)
      .map(([name, value]) => ({
        name,
        Income: value.income,
        Expense: -value.expense,
      }))
      .sort(
        (a, b) =>
          Math.abs(b.Income) + Math.abs(b.Expense) - (Math.abs(a.Income) + Math.abs(a.Expense)),
      );
  }, [labelAggregatedData]);

  const dailyAggregatedLabelData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date).toISOString().split('T')[0];
      if (!data[date]) {
        data[date] = {};
      }
      transaction.labels.forEach((label: string) => {
        if (!data[date][label]) {
          data[date][label] = 0;
        }
        data[date][label] += transaction.amount;
      });
    });
    return Object.entries(data).map(([date, labels]) => ({
      date,
      ...labels,
    }));
  }, [transactions]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl mb-8 flex items-center">
        <ChartPieIcon className="w-8 h-8 mr-2" />
        Financial Statistics
      </h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <MonthlyIncomeExpenseChart data={monthlyFinanceData} title="Monthly Income vs Expense" />

        <PieChartDiagram data={totalFinanceData} title="Total Income vs Expense" />

        <MonthlyTrendChart data={monthlyFinanceData} title="Monthly Balance Trend" />

        <CumulativeChart data={monthlyFinanceData} title="Cumulative Income and Expense" />

        <VerticalBarChart data={labelIncomeExpenseData} title="Top Labels by Income and Expense" />

        <MixedBarChart data={dailyAggregatedLabelData} title="Daily Transactions by Label" />
      </div>
    </div>
  );
};

export default StatsPage;
