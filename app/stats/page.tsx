'use client';

import React, { useCallback, useMemo, useState } from 'react';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useTransactionsFetch } from '@/hooks/useTransactionsFetch';

type MonthlyIncomeExpenseChartProps = {
  data: { name: string; Income: number; Expense: number; Balance: number }[];
  title?: string;
  colors?: { income: string; expense: string; balance: string };
  initial?: {
    showIncome: boolean;
    showExpense: boolean;
    showBalance: boolean;
    startDate: Date;
    endDate: Date;
    isCollapsed: boolean;
  };
  className?: string;
};

const MonthlyIncomeExpenseChart = ({
  data,
  title,
  colors,
  className,
  initial,
}: MonthlyIncomeExpenseChartProps) => {
  const now = new Date();
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const [startDate, setStartDate] = useState(initial?.startDate || yearAgo);
  const [endDate, setEndDate] = useState(initial?.endDate || now);
  const [showIncome, setShowIncome] = useState<boolean>(initial?.showIncome ?? true);
  const [showExpense, setShowExpense] = useState<boolean>(initial?.showExpense ?? true);
  const [showBalance, setShowBalance] = useState<boolean>(initial?.showBalance ?? false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(initial?.isCollapsed ?? true);

  const COLORS = {
    income: colors?.income || '#00C49F',
    expense: colors?.expense || '#FF8042',
    balance: colors?.balance || '#8884d8',
  };

  const filteredData = data.filter((item: { name: string }) => {
    const [month, year] = item.name.split('/');
    const itemDate = new Date(parseInt(year), parseInt(month) - 1);
    return itemDate >= startDate && itemDate <= endDate;
  });

  const resetFilters = () => {
    setStartDate(yearAgo);
    setEndDate(now);
    setShowIncome(true);
    setShowExpense(true);
    setShowBalance(false);
  };

  const [minDate, maxDate] = useMemo(() => {
    const dates = data.map((item) => {
      const [month, year] = item.name.split('/');
      return new Date(parseInt(year), parseInt(month) - 1);
    });
    return [
      new Date(Math.min(...dates.map((d) => d.getTime()))),
      new Date(Math.max(...dates.map((d) => d.getTime()))),
    ];
  }, [data]);

  const showEntireRange = useCallback(() => {
    setStartDate(minDate);
    setEndDate(maxDate);
  }, [minDate, maxDate, setStartDate, setEndDate]);

  return (
    <section className={className}>
      <div className="flex justify-between items-center mb-4">
        {title && <h2 className="text-2xl text-center">{title}</h2>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-6 h-6 flex items-center justify-center bg-base-200 rounded-full"
          aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          aria-expanded={!isCollapsed}
          title={isCollapsed ? 'Expand filters' : 'Collapse filters'}
        >
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>
      {!isCollapsed && (
        <div className="flex flex-col items-center mb-4">
          <div className="flex items-center mb-2">
            <label className="mr-2">Start Date:</label>
            <input
              type="date"
              value={startDate.toISOString().split('T')[0]}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              className="mr-4 p-1 border rounded"
            />
            <label className="mr-2">End Date:</label>
            <input
              type="date"
              value={endDate.toISOString().split('T')[0]}
              onChange={(e) => setEndDate(new Date(e.target.value))}
              className="p-1 border rounded"
            />
          </div>
          <div className="flex space-x-4 mb-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showIncome}
                onChange={(e) => setShowIncome(e.target.checked)}
                className="mr-2 form-checkbox h-5 w-5 text-teal-600"
              />
              <span>Show Income</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showExpense}
                onChange={(e) => setShowExpense(e.target.checked)}
                className="mr-2 form-checkbox h-5 w-5 text-teal-600"
              />
              <span>Show Expense</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showBalance}
                onChange={(e) => setShowBalance(e.target.checked)}
                className="mr-2 form-checkbox h-5 w-5 text-teal-600"
              />
              <span>Show Balance</span>
            </label>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Reset Filters
            </button>
            <button
              onClick={showEntireRange}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Show Entire Range
            </button>
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {showIncome && <Bar dataKey="Income" fill={COLORS.income} />}
          {showBalance && <Bar dataKey="Balance" fill={COLORS.balance} />}
          {showExpense && <Bar dataKey="Expense" fill={COLORS.expense} />}
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
};

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

  const COLORS = ['#00C49F', '#FF8042'];

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
    )
    .slice(0, 10); // Top 10 labels

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl mb-8">Financial Statistics</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <MonthlyIncomeExpenseChart data={chartData} title="Monthly Income vs Expense" />

        <section>
          <h2 className="text-2xl mb-4">Total Income vs Expense</h2>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section>
          <h2 className="text-2xl mb-4">Monthly Balance Trend</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="Balance" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </section>

        <section>
          <h2 className="text-2xl mb-4">Cumulative Income and Expense</h2>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="Income" stackId="1" stroke="#00C49F" fill="#00C49F" />
              <Area type="monotone" dataKey="Expense" stackId="1" stroke="#FF8042" fill="#FF8042" />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section>
          <h2 className="text-2xl mb-4">Top 10 Labels by Income and Expense</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={labelChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Legend />
              <Bar dataKey="Expense" fill="#FF8042" />
              <Bar dataKey="Income" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
    </div>
  );
};

export default StatsPage;
