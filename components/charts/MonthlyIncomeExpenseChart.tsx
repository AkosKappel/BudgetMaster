'use client';

import React, { useCallback, useMemo, useState } from 'react';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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
  height?: number;
};

const MonthlyIncomeExpenseChart = ({
  data,
  title,
  colors,
  className,
  initial,
  height = 400,
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
    <section className={`${className} shadow-lg rounded-lg border border-gray-200 p-4 bg-gray-100`}>
      <div className="flex justify-between items-center mb-4">
        {title && <h3 className="text-2xl text-center">{title}</h3>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-6 h-6 flex items-center justify-center rounded-full"
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
              <span title="Balance = Income - Expense">Show Balance</span>
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
      <ResponsiveContainer width="100%" height={height}>
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

export default MonthlyIncomeExpenseChart;
