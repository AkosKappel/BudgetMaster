'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Expenses', href: '/expenses' },
    { name: 'Reports', href: '/reports' },
  ];

  return (
    <nav className="left-0 bg-base-100 shadow-md w-64 p-4">
      <div className="flex flex-col h-full">
        <ul className="flex flex-col space-y-2">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block text-base font-medium p-3 rounded-lg transition-all duration-300
                  ${pathname === item.href ? 'text-primary bg-primary-content scale-105' : 'hover:text-primary hover:bg-primary-content hover:scale-105'}`}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Sidebar;
