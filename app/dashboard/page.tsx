import React from 'react';

import AddTransaction from '@/components/AddTransaction';

const DashboardPage = () => {
  return (
    <>
      <div className="text-3xl min-h-screen">Dashboard</div>
      <AddTransaction />
    </>
  );
};

export default DashboardPage;
