'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BanknotesIcon,
  CalendarIcon,
  ChartPieIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CogIcon,
  DocumentTextIcon,
  HomeIcon,
  InformationCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/solid';

import TransactionForm from '@/components/forms/TransactionForm';
import Modal from '@/components/layout/Modal';
import { type NavItem } from '@/types/ui';

export default function Sidebar() {
  const collapsedWidth = 768;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 0);

  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const pathname = usePathname();

  const openModal = (modalName: string) => setActiveModal(modalName);
  const closeModal = () => setActiveModal(null);

  const topItems: NavItem[] = [
    {
      name: 'Home',
      href: '/dashboard',
      icon: <HomeIcon className="w-5 h-5" />,
      tooltip: 'View your dashboard',
    },
    {
      name: 'History',
      href: '/history',
      icon: <CalendarIcon className="w-5 h-5" />,
      tooltip: 'See your transaction history',
    },
    {
      name: 'Stats',
      href: '/stats',
      icon: <ChartPieIcon className="w-5 h-5" />,
      tooltip: 'View your financial statistics',
    },
    {
      name: 'Savings',
      href: '/savings',
      icon: <BanknotesIcon className="w-5 h-5" />,
      tooltip: 'Manage your savings goals',
    },
    {
      name: 'Actions',
      href: '#',
      icon: <CogIcon className="w-5 h-5" />,
      tooltip: 'More actions',
      subItems: [
        {
          name: 'New Transaction',
          href: '#',
          icon: <PlusIcon className="w-5 h-5" />,
          action: () => openModal('transaction'),
          tooltip: 'Add a new transaction',
        },
        {
          name: 'Import Data',
          href: '/import',
          icon: <ArrowDownTrayIcon className="w-5 h-5" />,
          tooltip: 'Import your financial data',
        },
        {
          name: 'Export Data',
          href: '/export',
          icon: <ArrowUpTrayIcon className="w-5 h-5" />,
          tooltip: 'Export your financial data',
        },
      ],
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: <DocumentTextIcon className="w-5 h-5" />,
      tooltip: 'Generate financial reports',
    },
  ];

  const bottomItems: NavItem[] = [
    {
      name: 'About',
      href: '/about',
      icon: <InformationCircleIcon className="w-5 h-5" />,
      tooltip: 'Learn more about the app',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: <CogIcon className="w-5 h-5" />,
      tooltip: 'Adjust your settings',
    },
  ];

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsCollapsed(windowWidth < collapsedWidth); // automatically collapse sidebar on small screens
  }, [windowWidth, collapsedWidth]);

  const toggleSubMenu = (itemName: string) => {
    setExpandedItem(expandedItem === itemName ? null : itemName);
  };

  const renderNavItem = (item: NavItem, index: number, isTopNav: boolean) => {
    const isExpanded = expandedItem === item.name;
    const hasSubItems = item.subItems?.length ?? 0 > 0;

    return (
      <li
        key={item.name}
        className={`flex flex-col ${index < (isTopNav ? topItems.length : bottomItems.length) - 1 ? 'border-b border-base-300' : ''}`}
      >
        {item.action ? (
          <button
            onClick={item.action}
            className={`flex items-center w-full text-base font-medium p-3 rounded-lg transition-all duration-300 min-h-[3rem] cursor-pointer whitespace-nowrap
              ${pathname === item.href ? 'text-primary bg-primary-content scale-105' : 'hover:text-primary hover:bg-primary-content hover:scale-105'}`}
            title={item.tooltip}
          >
            {item.icon}
            {!isCollapsed && <span className="w-2/3 ml-3 truncate">{item.name}</span>}
          </button>
        ) : (
          <Link
            href={hasSubItems ? '#' : item.href}
            className={`flex items-center w-full text-base font-medium p-3 rounded-lg transition-all duration-300 min-h-[3rem] cursor-pointer whitespace-nowrap
              ${pathname === item.href ? 'text-primary bg-primary-content scale-105' : 'hover:text-primary hover:bg-primary-content hover:scale-105'}`}
            onClick={(e) => {
              if (hasSubItems) {
                e.preventDefault();
                toggleSubMenu(item.name);
              }
            }}
            title={item.tooltip}
          >
            {item.icon}
            {!isCollapsed && <span className="w-2/3 ml-3 truncate">{item.name}</span>}
            {hasSubItems && !isCollapsed && (
              <ChevronRightIcon
                className={`w-5 h-5 ml-auto transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            )}
          </Link>
        )}
        {hasSubItems && isExpanded && (
          <ul className={`${isCollapsed ? 'mt-2' : 'ml-6 mt-2'} space-y-2`}>
            {item.subItems!.map((subItem) => (
              <li key={subItem.name}>
                {subItem.action ? (
                  <button
                    onClick={subItem.action}
                    className={`flex items-center space-x-3 p-2 rounded-lg transition-all duration-300 whitespace-nowrap w-full text-left
                      ${pathname === subItem.href ? 'text-primary bg-primary-content scale-105' : 'hover:text-primary hover:bg-primary-content hover:scale-105'}`}
                    title={subItem.tooltip}
                  >
                    {subItem.icon}
                    {!isCollapsed && <span className="truncate">{subItem.name}</span>}
                  </button>
                ) : (
                  <Link
                    href={subItem.href}
                    className={`flex items-center space-x-3 p-2 rounded-lg transition-all duration-300 whitespace-nowrap
                      ${pathname === subItem.href ? 'text-primary bg-primary-content scale-105' : 'hover:text-primary hover:bg-primary-content hover:scale-105'}`}
                    title={subItem.tooltip}
                  >
                    {subItem.icon}
                    {!isCollapsed && <span className="truncate">{subItem.name}</span>}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <nav
        className={`overflow-x-hidden overflow-y-auto bg-base-100 shadow-md p-4 transition-all duration-300 ${isCollapsed ? 'min-w-20' : 'min-w-64'} h-screen sticky top-0 flex flex-col justify-between`}
      >
        <div>
          <button
            className="mb-4 p-2 bg-base-200 rounded-lg"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRightIcon className="w-6 h-6" /> : <ChevronLeftIcon className="w-6 h-6" />}
          </button>
          <div className="flex flex-col">
            <ul className="flex flex-col space-y-2">
              {topItems.map((item, index) => renderNavItem(item, index, true))}
            </ul>
          </div>
        </div>
        <hr className="my-1" />
        <div className="mt-auto">
          <ul className="flex flex-col space-y-2">
            {bottomItems.map((item, index) => renderNavItem(item, index, false))}
          </ul>
        </div>
      </nav>
      <Modal isOpen={activeModal === 'transaction'} onClose={closeModal}>
        <TransactionForm onSuccess={closeModal} transaction={null} />
      </Modal>
    </>
  );
}
