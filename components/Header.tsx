'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PlusIcon } from '@heroicons/react/24/solid';
import AddTransactionModal from '@/components/AddTransactionModal';

const Header = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  return (
    <header className="bg-primary text-primary-content shadow-lg">
      <div className="container mx-auto p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-4">
          <Image src="/logo.jpg" alt="Budget Master Logo" width={50} height={50} className="rounded-full" />
          <h1 className="text-3xl font-extrabold">Budget Master</h1>
        </Link>
        <div className="flex items-center space-x-4">
          <button className="btn btn-secondary shadow flex items-center space-x-2" onClick={openModal}>
            <PlusIcon className="w-5 h-5" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>
      <AddTransactionModal isOpen={isModalOpen} onClose={closeModal} />
    </header>
  );
};

export default Header;
