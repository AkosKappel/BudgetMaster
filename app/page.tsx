import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <button className="btn btn-primary"> Hello world</button>
      <Link href="/dashboard">Dashboard</Link>
    </main>
  );
}
