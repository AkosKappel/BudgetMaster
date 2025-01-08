import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

import LogoutButton from '@/components/ui/LogoutButton';
import { verifySession } from '@/lib/session';

export default async function Header() {
  const appName = 'Budget Master';
  const appSlogan = 'Master Your Money, Master Your Life';

  const session = await verifySession();

  return (
    <header className="bg-primary text-primary-content shadow-lg flex justify-between">
      <Link href="/" className="flex items-center m-4">
        <Image
          src="/BudgetMaster/logo.jpg"
          alt="Budget Master Logo"
          width={50}
          height={50}
          className="rounded-full mr-2"
        />
        <div>
          <h1 className="text-3xl font-extrabold">{appName}</h1>
          <p className="text-sm italic">{appSlogan}</p>
        </div>
      </Link>

      {session.isAuth && <LogoutButton />}
    </header>
  );
}
