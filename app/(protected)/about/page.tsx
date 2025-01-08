'use client';

import React from 'react';

import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CalendarIcon,
  ChartPieIcon,
  QuestionMarkCircleIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

export default function AboutPage() {
  return (
    <div className="min-h-screen p-6 flex flex-col items-center gap-8 pt-12 pb-24">
      <h2 className="text-4xl font-bold text-primary mb-4">About Budget Master</h2>
      <div className="max-w-4xl text-center">
        <p className="text-lg text-base-content mb-8">
          Budget Master started as a small side project to create a simple and effective tool for tracking finances. The
          goal is to make budgeting easier and help you stay on top of your spending, one step at a time.
        </p>
      </div>

      <div className="max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="flex flex-col items-center text-center p-6 bg-base-100  rounded-lg shadow-md">
          <ChartPieIcon className="w-12 h-12 text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Visualize Your Spending</h3>
          <p className="text-base-content">
            See where your money goes with simple charts that make tracking your monthly spending easy and clear.
          </p>
        </div>

        <div className="flex flex-col items-center text-center p-6 bg-base-100 rounded-lg shadow-md">
          <CalendarIcon className="w-12 h-12 text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Keep a Transaction History</h3>
          <p className="text-base-content">
            Stay organized with a full history of your income and expenses, all in one place for quick reference.
          </p>
        </div>

        <div className="flex flex-col items-center text-center p-6 bg-base-100 rounded-lg shadow-md">
          <TagIcon className="w-12 h-12 text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Categorize with Labels</h3>
          <p className="text-base-content">
            Add labels to your transactions to group them by type, making it easier to track your spending habits.
          </p>
        </div>

        <div className="flex flex-col items-center text-center p-6 bg-base-100 rounded-lg shadow-md">
          <QuestionMarkCircleIcon className="w-12 h-12 text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Find What You Need</h3>
          <p className="text-base-content">
            Use filters to search for transactions by date, amount, or category, so you can always find the details you
            need.
          </p>
        </div>

        <div className="flex flex-col items-center text-center p-6 bg-base-100 rounded-lg shadow-md">
          <ArrowUpTrayIcon className="w-12 h-12 text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Import Your Transactions</h3>
          <p className="text-base-content">
            Import your transactions from CSV files or use our API to connect with third-party services.
          </p>
        </div>

        <div className="flex flex-col items-center text-center p-6 bg-base-100 rounded-lg shadow-md">
          <ArrowDownTrayIcon className="w-12 h-12 text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">Export Your Data</h3>
          <p className="text-base-content">
            Export your transactions to CSV files or use our API to connect with third-party services.
          </p>
        </div>
      </div>
    </div>
  );
}
