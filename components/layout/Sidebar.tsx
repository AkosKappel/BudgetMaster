'use client';

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
  HomeIcon,
  InformationCircleIcon,
  PlusIcon,
} from '@heroicons/react/24/solid';

import TransactionForm from '@/components/forms/TransactionForm';
import Modal from '@/components/layout/Modal';
import SidebarItem, { type NavItem } from '@/components/layout/SidebarItem';

export default function Sidebar() {
  const collapsedWidth = 1080;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 0);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const pathname = usePathname();

  const toggleSubMenu = (itemName: string) => setExpandedItem(expandedItem === itemName ? null : itemName);
  const openModal = (modalName: string) => setActiveModal(modalName);
  const closeModal = () => setActiveModal(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsCollapsed(windowWidth < collapsedWidth); // collapse sidebar on small screens
  }, [windowWidth, collapsedWidth]);

  const topItems: NavItem[] = [
    { name: 'Home', href: '/dashboard', icon: <HomeIcon className="w-5 h-5" />, tooltip: 'View your dashboard' },
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
  ];

  const bottomItems: NavItem[] = [
    {
      name: 'About',
      href: '/about',
      icon: <InformationCircleIcon className="w-5 h-5" />,
      tooltip: 'Learn more about the app',
    },
    { name: 'Settings', href: '/settings', icon: <CogIcon className="w-5 h-5" />, tooltip: 'Adjust your settings' },
  ];

  return (
    <>
      <nav
        className={`overflow-x-hidden overflow-y-auto bg-base-100 shadow-md p-4 h-screen sticky top-0 flex flex-col justify-between transition-all duration-300 ${isCollapsed ? 'min-w-20' : 'min-w-64'}`}
      >
        <div>
          <button
            className="mb-4 p-2 bg-base-200 rounded-lg"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRightIcon className="w-6 h-6" /> : <ChevronLeftIcon className="w-6 h-6" />}
          </button>
          <ul className="flex flex-col space-y-2">
            {topItems.map((item) => (
              <SidebarItem
                key={item.name}
                item={item}
                isCollapsed={isCollapsed}
                isExpanded={expandedItem === item.name}
                toggleSubMenu={toggleSubMenu}
                pathname={pathname}
              />
            ))}
          </ul>
        </div>
        <ul className="flex flex-col space-y-2">
          {bottomItems.map((item) => (
            <SidebarItem
              key={item.name}
              item={item}
              isCollapsed={isCollapsed}
              isExpanded={false}
              toggleSubMenu={toggleSubMenu}
              pathname={pathname}
            />
          ))}
        </ul>
      </nav>
      <Modal isOpen={activeModal === 'transaction'} onClose={closeModal}>
        <TransactionForm onSuccess={closeModal} transaction={null} />
      </Modal>
    </>
  );
}
