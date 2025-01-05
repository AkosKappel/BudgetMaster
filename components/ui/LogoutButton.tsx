'use client';

import { useActionState } from 'react';

import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

import { logout } from '@/actions/auth';

export default function LogoutButton() {
  const [state, logoutAction] = useActionState(logout, undefined);

  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="btn btn-tertiary btn-sm hover:bg-teal-700 hover:text-white transition-colors duration-200 ease-in-out border-0 mx-4 my-6 flex items-center"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
        <span>Logout</span>
      </button>
    </form>
  );
}
