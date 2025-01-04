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

type MixedBarChartProps = {
  data: any[];
  title: string;
  className?: string;
  height?: number;
};

const MixedBarChart: React.FC<MixedBarChartProps> = ({
  data,
  title,
  className = '',
  height = 400,
}) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  const colors = [
    '#8884d8',
    '#82ca9d',
    '#ffc658',
    '#ff7300',
    '#a4de6c',
    '#d0ed57',
    '#ff4500',
    '#00CED1',
    '#FF1493',
    '#32CD32',
    '#FFD700',
    '#4B0082',
    '#FF6347',
    '#20B2AA',
    '#FF69B4',
    '#00FA9A',
    '#DC143C',
    '#1E90FF',
    '#FF8C00',
    '#9370DB',
    '#00BFFF',
  ];
  const labels = Array.from(
    new Set(data.flatMap((item) => Object.keys(item).filter((key) => key !== 'date'))),
  );

  const filteredData = data.filter((item) => {
    const itemDate = new Date(item.date);
    return (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);
  });

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
        <div className="flex flex-col items-center mb-4">
          <div className="flex items-center mb-2">
            <label className="mr-2">From:</label>
            <input
              type="date"
              value={startDate ? startDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : null)}
              className="mr-4 p-1 border rounded"
            />
            <label className="mr-2">To:</label>
            <input
              type="date"
              value={endDate ? endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : null)}
              className="p-1 border rounded"
            />
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {labels.map((label, index) => (
            <Bar key={label} dataKey={label} stackId="a" fill={colors[index % colors.length]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
};

export default MixedBarChart;
