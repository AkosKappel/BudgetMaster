import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <div className="flex flex-grow">
        <Sidebar />
        <main className="container mx-auto p-4 overflow-auto">{children}</main>
      </div>
      <Footer />
    </>
  );
}
