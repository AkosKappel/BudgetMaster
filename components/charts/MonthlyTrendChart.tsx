'use client';

import React, { useCallback, useMemo, useState } from 'react';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type MonthlyTrendProps = {
  data: { name: string; Balance: number }[];
  title?: string;
  color?: string;
  className?: string;
  height?: number;
};

const MonthlyTrendChart: React.FC<MonthlyTrendProps> = ({
  data,
  title,
  color = '#8884d8',
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
        <LineChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="Balance" stroke={color} />
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
};

export default MonthlyTrendChart;
