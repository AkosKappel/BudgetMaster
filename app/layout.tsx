import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastContainer } from 'react-toastify';

import QueryProvider from '@/providers/QueryProvider';
import ReduxProvider from '@/providers/ReduxProvider';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Budget Master',
  description: 'Track your finances and monitor your monthly budget efficiency.',
};

const providers = [QueryProvider, ReduxProvider];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-base-200 text-base-content`}>
        {providers.reduceRight(
          (nested, Provider) => (
            <Provider>{nested}</Provider>
          ),
          <>{children}</>,
        )}
        <ToastContainer position="bottom-right" autoClose={5000} />
      </body>
    </html>
  );
}
