'use client';

import React from 'react';

import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';

export default function ExportPage() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl mb-8 flex items-center">
        <ArrowUpTrayIcon className="w-8 h-8 mr-2 text-primary" />
        Export Transactions
      </h1>
    </div>
  );
}
