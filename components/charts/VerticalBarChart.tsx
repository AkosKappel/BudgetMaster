'use client';

import React, { useState } from 'react';

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
  className?: string;
  height?: number;
};

const VerticalBarChart: React.FC<VerticalBarChartProps> = ({
  data,
  title,
  colors = { income: '#00C49F', expense: '#FF8042' },
  className,
  height = 400,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [itemsToShow, setItemsToShow] = useState<number>(10);

  const filteredData = data.slice(0, itemsToShow);

  return (
    <section className={`${className} shadow-lg rounded-lg border border-gray-200 p-4 bg-gray-100`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl text-center">{title}</h3>
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
        <div className="my-4">
          <label htmlFor="itemsToShow" className="block mb-2">
            Number of items to show:
          </label>
          <input
            type="number"
            id="itemsToShow"
            value={itemsToShow}
            onChange={(e) => setItemsToShow(Math.max(1, parseInt(e.target.value)))}
            className="w-full p-2 border rounded"
            min="1"
            max={data.length}
          />
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={filteredData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" />
          <Tooltip />
          <Legend />
          <Bar dataKey="Expense" fill={colors.expense} />
          <Bar dataKey="Income" fill={colors.income} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
};

export default VerticalBarChart;
