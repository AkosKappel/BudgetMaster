'use client';

import React, { useState } from 'react';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

type PieChartDiagramProps = {
  data: { name: string; value: number }[];
  title?: string;
  colors?: string[];
  className?: string;
  height?: number;
};

const PieChartDiagram: React.FC<PieChartDiagramProps> = ({
  data,
  title,
  colors = [
    '#00C49F',
    '#FF8042',
    '#0088FE',
    '#FFBB28',
    '#FF6B6B',
    '#4CAF50',
    '#9C27B0',
    '#FF9800',
    '#03A9F4',
    '#E91E63',
  ],
  className,
  height = 400,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [visibleSections, setVisibleSections] = useState<{ [key: string]: boolean }>(
    data.reduce((acc, item) => ({ ...acc, [item.name]: true }), {}),
  );

  const toggleSection = (name: string) => {
    setVisibleSections((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const checkAll = () => {
    setVisibleSections(data.reduce((acc, item) => ({ ...acc, [item.name]: true }), {}));
  };

  const uncheckAll = () => {
    setVisibleSections(data.reduce((acc, item) => ({ ...acc, [item.name]: false }), {}));
  };

  const filteredData = data.filter((item) => visibleSections[item.name]);

  const colorMap = data.reduce(
    (acc, item, index) => {
      acc[item.name] = colors[index % colors.length];
      return acc;
    },
    {} as { [key: string]: string },
  );

  const total = filteredData.reduce((sum, item) => sum + item.value, 0);

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
          <div className="flex flex-wrap justify-center gap-2 mb-2">
            {data.map((item) => (
              <label key={item.name} className="flex items-center">
                <input
                  type="checkbox"
                  checked={visibleSections[item.name]}
                  onChange={() => toggleSection(item.name)}
                  className="mr-2 form-checkbox h-5 w-5 shadow-sm"
                  style={{ color: colorMap[item.name] }}
                />
                <span className="text-sm">{item.name}</span>
              </label>
            ))}
          </div>
          <div className="flex space-x-4 mt-2">
            <button onClick={checkAll} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Check All
            </button>
            <button
              onClick={uncheckAll}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Uncheck All
            </button>
          </div>
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={filteredData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={120}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={500}
            label={({ name, percent, value }) =>
              `${name}: ${value.toFixed(2)} (${(percent * 100).toFixed(0)}%)`
            }
          >
            {filteredData.map((entry) => (
              <Cell
                key={`cell-${entry.name}`}
                fill={colorMap[entry.name]}
                stroke="#fff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              `${(value as number).toFixed(2)} (${(((value as number) / total) * 100).toFixed(2)}%)`
            }
          />
          <Legend formatter={(value) => value} />
        </PieChart>
      </ResponsiveContainer>
    </section>
  );
};

export default PieChartDiagram;
