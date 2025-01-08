'use client';

import Link from 'next/link';
import React from 'react';

import { ChevronRightIcon } from '@heroicons/react/24/solid';

export type NavItem = {
  name: string;
  href: string;
  icon?: React.ReactNode;
  subItems?: NavItem[];
  action?: () => void;
  tooltip?: string;
};

export default function SidebarItem({
  item,
  isCollapsed,
  isExpanded,
  toggleSubMenu,
  pathname,
}: {
  item: NavItem;
  isCollapsed: boolean;
  isExpanded: boolean;
  toggleSubMenu: (itemName: string) => void;
  pathname: string;
}) {
  const hasSubItems = item.subItems?.length ?? 0 > 0;

  const handleClick = (e: React.MouseEvent) => {
    if (hasSubItems) {
      e.preventDefault();
      toggleSubMenu(item.name);
    }
  };

  const SidebarSubItem = ({
    subItem,
    isCollapsed,
    pathname,
  }: {
    subItem: NavItem;
    isCollapsed: boolean;
    pathname: string;
  }) => {
    return subItem.action ? (
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
    );
  };

  return (
    <li className="flex flex-col border-b border-base-300">
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
          onClick={handleClick}
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
            <SidebarSubItem key={subItem.name} subItem={subItem} isCollapsed={isCollapsed} pathname={pathname} />
          ))}
        </ul>
      )}
    </li>
  );
}
