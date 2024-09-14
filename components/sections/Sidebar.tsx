'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import {
  ChartPieIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CogIcon,
  DocumentTextIcon,
  HomeIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/solid';

type SidebarProps = {
  collapsedWidth?: number;
};

const Sidebar: React.FC<SidebarProps> = ({ collapsedWidth = 768 }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 0,
  );
  const pathname = usePathname();

  const topNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <HomeIcon className="w-5 h-5" /> },
    { name: 'History', href: '/transactions', icon: <ClockIcon className="w-5 h-5" /> },
    { name: 'Stats', href: '/stats', icon: <ChartPieIcon className="w-5 h-5" /> },
    { name: 'Reports', href: '/reports', icon: <DocumentTextIcon className="w-5 h-5" /> },
  ];

  const bottomNavItems = [
    { name: 'About', href: '/about', icon: <InformationCircleIcon className="w-5 h-5" /> },
    { name: 'Settings', href: '/settings', icon: <CogIcon className="w-5 h-5" /> },
  ];

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsCollapsed(windowWidth < collapsedWidth); // automatically collapse sidebar on small screens
  }, [windowWidth, collapsedWidth]);

  return (
    <nav
      className={`overflow-x-hidden overflow-y-auto bg-base-100 shadow-md p-4 transition-all duration-300 ${isCollapsed ? 'min-w-20' : 'min-w-64'} h-screen sticky top-0 flex flex-col justify-between`}
    >
      <div>
        <button
          className="mb-4 p-2 bg-base-200 rounded-lg"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="w-6 h-6" />
          ) : (
            <ChevronLeftIcon className="w-6 h-6" />
          )}
        </button>
        <div className="flex flex-col">
          <ul className="flex flex-col space-y-2">
            {topNavItems.map((item, index) => (
              <li
                key={item.href}
                className={`flex items-center ${index < topNavItems.length - 1 ? 'border-b border-base-300' : ''}`}
              >
                <Link
                  href={item.href}
                  className={`flex items-center justify-center space-x-3 w-full text-base font-medium p-3 rounded-lg transition-all duration-300 min-h-[3rem]
                    ${pathname === item.href ? 'text-primary bg-primary-content scale-105' : 'hover:text-primary hover:bg-primary-content hover:scale-105'}`}
                >
                  {item.icon}
                  {!isCollapsed && <span className="w-2/3">{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <hr className="my-1" />
      <div className="mt-auto">
        <ul className="flex flex-col space-y-2">
          {bottomNavItems.map((item, index) => (
            <li
              key={item.href}
              className={`flex items-center ${index < bottomNavItems.length - 1 ? 'border-b border-base-300' : ''}`}
            >
              <Link
                href={item.href}
                className={`flex items-center justify-center space-x-3 w-full text-base font-medium p-3 rounded-lg transition-all duration-300 min-h-[3rem]
                  ${pathname === item.href ? 'text-primary bg-primary-content scale-105' : 'hover:text-primary hover:bg-primary-content hover:scale-105'}`}
              >
                {item.icon}
                {!isCollapsed && <span className="w-2/3">{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};

export default Sidebar;
