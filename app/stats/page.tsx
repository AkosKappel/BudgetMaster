'use client';

import React from 'react';

import { ChartPieIcon } from '@heroicons/react/24/solid';

import CumulativeChart from '@/components/charts/CumulativeChart';
import MonthlyIncomeExpenseChart from '@/components/charts/MonthlyIncomeExpenseChart';
import MonthlyTrendChart from '@/components/charts/MonthlyTrendChart';
import PieChartDiagram from '@/components/charts/PieChartDiagram';
import VerticalBarChart from '@/components/charts/VerticalBarChart';
import { useTransactionsFetch } from '@/hooks/useTransactionsFetch';

const StatsPage = () => {
  const { transactions, loading, error } = useTransactionsFetch('/api/transactions');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const monthlyData = transactions.reduce(
    (acc, transaction) => {
      const date = new Date(transaction.date);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      if (!acc[monthYear]) {
        acc[monthYear] = { income: 0, expense: 0 };
      }
      if (transaction.isExpense) {
        acc[monthYear].expense += transaction.amount;
      } else {
        acc[monthYear].income += transaction.amount;
      }
      return acc;
    },
    {} as Record<string, { income: number; expense: number }>,
  );

  const chartData = Object.entries(monthlyData)
    .map(([name, data]) => ({
      name,
      Income: data.income,
      Expense: data.expense,
      Balance: data.income - data.expense,
    }))
    .reverse();

  const totalIncome = transactions.reduce((sum, t) => sum + (t.isExpense ? 0 : t.amount), 0);
  const totalExpense = transactions.reduce((sum, t) => sum + (t.isExpense ? t.amount : 0), 0);

  const pieChartData = [
    { name: 'Income', value: totalIncome },
    { name: 'Expense', value: totalExpense },
  ];

  const labelDistribution = transactions.reduce(
    (acc, transaction) => {
      transaction.labels.forEach((label) => {
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

  const labelChartData = Object.entries(labelDistribution)
    .map(([name, value]) => ({
      name,
      Income: value.income,
      Expense: -value.expense,
    }))
    .sort(
      (a, b) =>
        Math.abs(b.Income) + Math.abs(b.Expense) - (Math.abs(a.Income) + Math.abs(a.Expense)),
    );

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl mb-8 flex items-center">
        <ChartPieIcon className="w-8 h-8 mr-2" />
        Financial Statistics
      </h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <MonthlyIncomeExpenseChart data={chartData} title="Monthly Income vs Expense" />

        <PieChartDiagram data={pieChartData} title="Total Income vs Expense" />

        <MonthlyTrendChart data={chartData} title="Monthly Balance Trend" />

        <CumulativeChart data={chartData} title="Cumulative Income and Expense" />

        <VerticalBarChart data={labelChartData} title="Top 10 Labels by Income and Expense" />
      </div>
    </div>
  );
};

export default StatsPage;
