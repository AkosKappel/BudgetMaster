'use client';

import { redirect } from 'next/navigation';
import { useActionState } from 'react';

import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

import { logout } from '@/actions/auth';
import { useCurrentUser } from '@/hooks/auth';

export default function LogoutButton() {
  const [state, logoutAction] = useActionState(logout, undefined);

  const { user } = useCurrentUser();

  const navigateToSettings = () => {
    redirect('/settings');
  };

  return (
    <div className="flex items-center">
      <div className="flex mx-4 my-6">
        <button
          type="button"
          onClick={navigateToSettings}
          className="btn btn-tertiary btn-sm hover:bg-teal-700 hover:text-white transition-colors duration-200 ease-in-out border-0 rounded-r-md flex items-center px-4"
        >
          <span className="text-sm font-bold">{user?.name}</span>
        </button>

        <form action={logoutAction}>
          <button
            type="submit"
            className="btn btn-tertiary btn-sm hover:bg-teal-700 hover:text-white transition-colors duration-200 ease-in-out border-0 rounded-l-md flex items-center px-4"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
            <span>Logout</span>
          </button>
        </form>
      </div>
    </div>
  );
}
