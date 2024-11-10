import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

const Header = () => {
  return (
    <header className="bg-primary text-primary-content shadow-lg flex justify-between">
      <Link href="/" className="flex items-center m-4">
        <Image
          src="/logo.jpg"
          alt="Budget Master Logo"
          width={50}
          height={50}
          className="rounded-full mr-2"
        />
        <div>
          <h1 className="text-3xl font-extrabold">Budget Master</h1>
          <p className="text-sm italic">Master Your Money, Master Your Life</p>
        </div>
      </Link>
      <ul className="flex items-center gap-4 m-4">
        <li className="cursor-pointer rounded-full px-4 py-2 bg-white font-semibold hover:scale-105 transition duration-300">
          <Link href="/">Sign Up</Link>
        </li>
        <li className="cursor-pointer rounded-full px-4 py-2 bg-white font-semibold hover:scale-105 transition duration-300">
          <Link href="/">Log in</Link>
        </li>
      </ul>
    </header>
  );
};

export default Header;
