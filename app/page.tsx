'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

import LoadingSpinner from '@/components/ui/LoadingSpinner';

const Home: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-64">
      <LoadingSpinner />
    </div>
  );
};

export default Home;
