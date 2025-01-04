'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import bcrypt from 'bcryptjs';

import Modal from '@/components/layout/Modal';

const SignInForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(true);
  const router = useRouter();

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hashedPassword = await bcrypt.hash(password, 10);

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: hashedPassword }),
    });

    if (res.ok) {
      // Optional: Automatically sign the user in after signup
      await signIn('credentials', { redirect: true, email, password });
      router.push('/');
    } else {
      alert('Failed to sign up');
    }
  };

  return (
    <Modal isOpen={isModalOpen} onClose={closeModal}>
      <div className="space-y-4">
        <h2 className="text-2xl">Sign Up</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label htmlFor="email" className="text-sm">
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="p-2 border-2 rounded-md focus:border-teal-500"
            />
          </div>
          <div className="flex flex-col space-y-2">
            <label htmlFor="password" className="text-sm">
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="p-2 border-2 rounded-md focus:border-teal-500"
            />
          </div>
          <button
            type="submit"
            className="bg-primary hover:bg-primary-focus font-bold py-2 px-4 rounded hover:scale-105 transition duration-300"
          >
            Sign Up
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default SignInForm;
