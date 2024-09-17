'use client';

import React, { useCallback, useMemo, useState } from 'react';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type CumulativeChartProps = {
  data: { name: string; Income: number; Expense: number }[];
  title?: string;
  colors?: { income: string; expense: string };
  className?: string;
  height?: number;
};

const CumulativeChart: React.FC<CumulativeChartProps> = ({
  data,
  title,
  colors = { income: '#00C49F', expense: '#FF8042' },
  className,
  height = 400,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const now = new Date();
  const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const [startDate, setStartDate] = useState(yearAgo);
  const [endDate, setEndDate] = useState(now);

  const filteredData = data.filter((item) => {
    const [month, year] = item.name.split('/');
    const itemDate = new Date(parseInt(year), parseInt(month) - 1);
    return itemDate >= startDate && itemDate <= endDate;
  });

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

  const resetFilters = () => {
    setStartDate(yearAgo);
    setEndDate(now);
  };

  const showEntireRange = useCallback(() => {
    setStartDate(minDate);
    setEndDate(maxDate);
  }, [minDate, maxDate]);

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
        <div className="mt-4">
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
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="Income"
            stackId="1"
            stroke={colors.income}
            fill={colors.income}
          />
          <Area
            type="monotone"
            dataKey="Expense"
            stackId="1"
            stroke={colors.expense}
            fill={colors.expense}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
};

export default CumulativeChart;
