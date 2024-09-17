'use client';

import React from 'react';

import { BanknotesIcon } from '@heroicons/react/24/solid';

const SavingsPage = () => {
  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl mb-8 flex items-center">
        <BanknotesIcon className="w-8 h-8 mr-2" />
        Saving Plans
      </h1>
    </div>
  );
};

export default SavingsPage;
