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

type VerticalBarChartProps = {
  data: { name: string; Income: number; Expense: number }[];
  title?: string;
  colors?: { income: string; expense: string };
  initial?: {
    itemsToShow: number;
    isCollapsed: boolean;
    showIncome: boolean;
    showExpense: boolean;
  };
  className?: string;
  height?: number;
};

const VerticalBarChart: React.FC<VerticalBarChartProps> = ({
  data,
  title,
  colors = { income: '#00C49F', expense: '#FF8042' },
  initial = { itemsToShow: 10, isCollapsed: true, showIncome: true, showExpense: true },
  className,
  height = 400,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(initial.isCollapsed);
  const [itemsToShow, setItemsToShow] = useState<number>(initial.itemsToShow);
  const [showIncome, setShowIncome] = useState<boolean>(initial.showIncome);
  const [showExpense, setShowExpense] = useState<boolean>(initial.showExpense);

  const filteredData = useMemo(() => {
    let sortedData = [...data];
    if (showIncome && !showExpense) {
      sortedData.sort((a, b) => b.Income - a.Income);
    } else if (showExpense && !showIncome) {
      sortedData.sort((a, b) => a.Expense - b.Expense);
    }
    return sortedData.slice(0, itemsToShow).map((item) => {
      const newItem: { name: string; Income?: number; Expense?: number } = { name: item.name };
      if (showIncome) newItem.Income = item.Income;
      if (showExpense) newItem.Expense = item.Expense;
      return newItem;
    });
  }, [data, itemsToShow, showIncome, showExpense]);

  const resetFilters = useCallback(() => {
    setItemsToShow(initial.itemsToShow);
    setShowIncome(initial.showIncome);
    setShowExpense(initial.showExpense);
  }, [initial]);

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
            <label htmlFor="itemsToShow" className="mr-2">
              Number of items to show:
            </label>
            <input
              type="number"
              id="itemsToShow"
              value={itemsToShow}
              onChange={(e) => setItemsToShow(Math.max(1, parseInt(e.target.value)))}
              className="p-1 border rounded"
              min="1"
              max={data.length}
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
          </div>
          <div className="flex space-x-4">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors duration-200"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={filteredData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" />
          <Tooltip />
          <Legend />
          {showExpense && <Bar dataKey="Expense" fill={colors.expense} />}
          {showIncome && <Bar dataKey="Income" fill={colors.income} />}
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
};

export default VerticalBarChart;
