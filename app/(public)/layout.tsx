import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main className="container mx-auto p-4 overflow-auto">{children}</main>;
      <Footer />
    </>
  );
}
