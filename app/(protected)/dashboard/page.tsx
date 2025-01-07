'use client';

import { HomeIcon } from '@heroicons/react/24/solid';

import AddTransactionButton from '@/components/ui/AddTransactionButton';

export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl mb-8 flex items-center">
        <HomeIcon className="w-8 h-8 mr-2" />
        Dashboard
      </h1>

      <AddTransactionButton className="fixed bottom-5 right-5" />
    </div>
  );
}
