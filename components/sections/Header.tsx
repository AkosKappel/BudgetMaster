import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

const Header = () => {
  return (
    <header className="bg-primary text-primary-content shadow-lg">
      <div className="mx-auto p-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-4">
          <Image
            src="/logo.jpg"
            alt="Budget Master Logo"
            width={50}
            height={50}
            className="rounded-full"
          />
          <div>
            <h1 className="text-3xl font-extrabold">Budget Master</h1>
            <p className="text-sm italic">Master Your Money, Master Your Life</p>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Header;
