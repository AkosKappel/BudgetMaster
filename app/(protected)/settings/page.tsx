'use client';

import React from 'react';

import { AtSymbolIcon, CogIcon, UserIcon } from '@heroicons/react/24/solid';

import { useCurrentUser } from '@/hooks/auth';

export default function SettingsPage() {
  const { user } = useCurrentUser();

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-3xl mb-8 flex items-center">
        <CogIcon className="w-8 h-8 mr-2 text-primary" />
        Settings
      </h1>

      <div className="max-w-md bg-base-100 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">User Information</h2>
        <div className="flex items-center mb-4">
          <UserIcon className="w-6 h-6 text-primary mr-2" />
          <span className="text-base-content">
            <strong>Name:</strong> {user?.name || 'N/A'}
          </span>
        </div>
        <div className="flex items-center">
          <AtSymbolIcon className="w-6 h-6 text-primary mr-2" />
          <span className="text-base-content">
            <strong>Email:</strong> {user?.email || 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
}
