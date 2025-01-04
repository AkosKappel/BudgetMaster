import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastContainer } from 'react-toastify';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import QueryProvider from '@/providers/QueryProvider';
import ReduxProvider from '@/providers/ReduxProvider';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Budget Master',
  description: 'Track your finances and monitor your monthly budget effortlessly.',
};

const providers = [QueryProvider, ReduxProvider];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased flex flex-col min-h-screen bg-base-200 text-base-content`}
      >
        {providers.reduceRight(
          (children, Provider) => (
            <Provider>{children}</Provider>
          ),
          <>
            <Header />
            <div className="flex flex-grow">
              <Sidebar />
              <main className="flex-grow container mx-auto p-4 overflow-auto">{children}</main>
            </div>
            <Footer />
            <ToastContainer position="bottom-right" autoClose={5000} />
          </>,
        )}
      </body>
    </html>
  );
}
