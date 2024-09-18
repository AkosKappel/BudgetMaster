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
  initial?: {
    showIncome: boolean;
    showExpense: boolean;
    startDate: Date | null;
    endDate: Date | null;
    isCollapsed: boolean;
  };
  className?: string;
  height?: number;
};

const CumulativeChart: React.FC<CumulativeChartProps> = ({
  data,
  title,
  colors = { income: '#00C49F', expense: '#FF8042' },
  initial = {
    showIncome: true,
    showExpense: true,
    startDate: null,
    endDate: null,
    isCollapsed: true,
  },
  className,
  height = 400,
}) => {
  const now = useMemo(() => new Date(), []);
  const yearAgo = useMemo(() => {
    return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }, [now]);

  const [startDate, setStartDate] = useState<Date | null>(initial?.startDate || yearAgo);
  const [endDate, setEndDate] = useState<Date | null>(initial?.endDate || now);
  const [showIncome, setShowIncome] = useState<boolean>(initial.showIncome);
  const [showExpense, setShowExpense] = useState<boolean>(initial.showExpense);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(initial.isCollapsed);
  const [selectedRange, setSelectedRange] = useState<string>('');

  const rangeOptions = [
    { value: 'lastMonth', label: 'Last Month' },
    { value: 'last3Months', label: 'Last 3 Months' },
    { value: 'last6Months', label: 'Last 6 Months' },
    { value: 'lastYear', label: 'Last Year' },
    { value: 'last2Years', label: 'Last 2 Years' },
    { value: 'last3Years', label: 'Last 3 Years' },
    { value: 'ytd', label: 'Year to Date' },
    { value: 'entireHistory', label: 'Entire History' },
  ];

  const filteredData = data.filter((item) => {
    const [month, year] = item.name.split('/');
    const itemDate = new Date(parseInt(year), parseInt(month) - 1);
    return (!startDate || itemDate >= startDate) && (!endDate || itemDate <= endDate);
  });

  const resetFilters = () => {
    setStartDate(yearAgo);
    setEndDate(now);
    setShowIncome(true);
    setShowExpense(true);
    setSelectedRange('');
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

  const handleRangeChange = useCallback(
    (range: string) => {
      const now = new Date();
      switch (range) {
        case 'lastMonth':
          setStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
          setEndDate(now);
          break;
        case 'last3Months':
          setStartDate(new Date(now.getFullYear(), now.getMonth() - 3, 1));
          setEndDate(now);
          break;
        case 'last6Months':
          setStartDate(new Date(now.getFullYear(), now.getMonth() - 6, 1));
          setEndDate(now);
          break;
        case 'lastYear':
          setStartDate(new Date(now.getFullYear() - 1, now.getMonth(), 1));
          setEndDate(now);
          break;
        case 'last2Years':
          setStartDate(new Date(now.getFullYear() - 2, now.getMonth(), 1));
          setEndDate(now);
          break;
        case 'last3Years':
          setStartDate(new Date(now.getFullYear() - 3, now.getMonth(), 1));
          setEndDate(now);
          break;
        case 'ytd':
          setStartDate(new Date(now.getFullYear(), 0, 1));
          setEndDate(now);
          break;
        case 'entireHistory':
          setStartDate(minDate);
          setEndDate(maxDate);
          break;
        default:
          setStartDate(yearAgo);
          setEndDate(now);
          break;
      }
      setSelectedRange(range);
    },
    [minDate, maxDate, yearAgo],
  );

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
              value={startDate ? startDate.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                setStartDate(e.target.value ? new Date(e.target.value) : null);
                setSelectedRange('');
              }}
              className="mr-4 p-1 border rounded"
            />
            <label className="mr-2">End Date:</label>
            <input
              type="date"
              value={endDate ? endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => {
                setEndDate(e.target.value ? new Date(e.target.value) : null);
                setSelectedRange('');
              }}
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
          </div>
          <div className="flex space-x-4">
            <select
              value={selectedRange}
              onChange={(e) => handleRangeChange(e.target.value)}
              className="px-4 py-2 rounded transition-colors duration-200 cursor-pointer bg-gray-500 text-white hover:bg-gray-600"
            >
              <option value="">Select Range</option>
              {rangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
        <AreaChart data={filteredData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          {showIncome && (
            <Area
              type="monotone"
              dataKey="Income"
              stackId="1"
              stroke={colors.income}
              fill={colors.income}
            />
          )}
          {showExpense && (
            <Area
              type="monotone"
              dataKey="Expense"
              stackId="1"
              stroke={colors.expense}
              fill={colors.expense}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
};

export default CumulativeChart;
