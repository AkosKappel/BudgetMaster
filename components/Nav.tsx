'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

const Nav: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Expenses', href: '/expenses' },
    { name: 'Reports', href: '/reports' },
  ];

  return (
    <nav className="bg-base-100 shadow-md">
      <div className="container mx-auto p-4">
        <ul className="flex space-x-4">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`text-base font-medium p-2 rounded-lg transition-all duration-300
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

export default Nav;
