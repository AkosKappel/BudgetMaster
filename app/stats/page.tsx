'use client';

import React from 'react';

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
      Expense: -value.expense, // Negative value for left side display
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
        <section>
          <h2 className="text-2xl mb-4">Monthly Income vs Expense</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Income" fill="#00C49F" />
              <Bar dataKey="Expense" fill="#FF8042" />
            </BarChart>
          </ResponsiveContainer>
        </section>

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
