'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import {
  HomeIcon,
  CurrencyEuroIcon,
  ChartPieIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/solid';

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 0);
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <HomeIcon className="w-5 h-5" /> },
    { name: 'Expenses', href: '/expenses', icon: <CurrencyEuroIcon className="w-5 h-5" /> },
    { name: 'Stats', href: '/stats', icon: <ChartPieIcon className="w-5 h-5" /> },
    { name: 'Reports', href: '/reports', icon: <DocumentTextIcon className="w-5 h-5" /> },
  ];

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsCollapsed(windowWidth < 768); // automatically collapse sidebar on small screens
  }, [windowWidth]);

  return (
    <nav className={`bg-base-100 shadow-md p-4 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex flex-col h-full">
        <button className="mb-4 p-2 bg-base-200 rounded-lg" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronRightIcon className="w-6 h-6" /> : <ChevronLeftIcon className="w-6 h-6" />}
        </button>
        <ul className="flex flex-col space-y-2">
          {navItems.map((item, index) => (
            <li
              key={item.href}
              className={`flex items-center ${index < navItems.length - 1 ? 'border-b border-base-300' : ''}`}
            >
              <Link
                href={item.href}
                className={`flex items-center space-x-3 w-full text-base font-medium p-3 rounded-lg transition-all duration-300 min-h-[3rem]
                  ${pathname === item.href ? 'text-primary bg-primary-content scale-105' : 'hover:text-primary hover:bg-primary-content hover:scale-105'}`}
              >
                {item.icon}
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Sidebar;
