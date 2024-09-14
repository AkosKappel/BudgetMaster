import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ReactNode } from 'react';

import Footer from '@/components/sections/Footer';
import Header from '@/components/sections/Header';
import Sidebar from '@/components/sections/Sidebar';

import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Budget Master',
  description: 'Track and manage your expenses',
};

interface LayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen bg-base-200`}>
        <Header />
        <div className="flex flex-grow">
          <Sidebar />
          <main className="flex-grow container mx-auto p-4 overflow-auto">{children}</main>
        </div>
        <Footer />
      </body>
    </html>
  );
}
