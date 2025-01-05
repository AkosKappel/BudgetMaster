'use client';

import { useState } from 'react';
import { useActionState } from 'react';

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

import { signup } from '@/actions/auth';

type FormData = {
  name: string;
  email: string;
  password: string;
};

export default function SignupForm() {
  const [state, signupAction, isPending] = useActionState(signup, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', password: '' });

  const isFormValid = !!(formData.name && formData.email && formData.password);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form action={signupAction} className="space-y-4">
      <div className="form-control">
        <label htmlFor="name" className="label">
          <span className="label-text">Name</span>
        </label>
        <input
          id="name"
          name="name"
          placeholder="John Doe"
          className="input input-bordered focus:outline-none focus:border-teal-500 focus:border-2 hover:border-teal-500 transition-colors duration-200 ease-in-out"
          value={formData.name}
          onChange={handleInputChange}
        />
        {state?.errors?.name && <p className="mt-1 text-sm text-error">{state.errors.name}</p>}
      </div>
      <div className="form-control">
        <label htmlFor="email" className="label">
          <span className="label-text">Email</span>
        </label>
        <input
          id="email"
          name="email"
          placeholder="john@example.com"
          className="input input-bordered focus:outline-none focus:border-teal-500 focus:border-2 hover:border-teal-500 transition-colors duration-200 ease-in-out"
          value={formData.email}
          onChange={handleInputChange}
        />
        {state?.errors?.email && <p className="mt-1 text-sm text-error">{state.errors.email}</p>}
      </div>
      <div className="form-control">
        <label htmlFor="password" className="label">
          <span className="label-text">Password</span>
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            className="input input-bordered focus:outline-none focus:border-teal-500 focus:border-2 hover:border-teal-500 transition-colors duration-200 ease-in-out w-full pr-12"
            value={formData.password}
            onChange={handleInputChange}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
        </div>
        {state?.errors?.password && (
          <div className="mt-1 text-sm text-error">
            <p>Password must:</p>
            <ul className="list-disc list-inside">
              {state.errors.password.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <button
        aria-disabled={!isFormValid || isPending}
        type="submit"
        className="btn btn-primary w-full"
        disabled={!isFormValid || isPending}
      >
        {isPending ? 'Submitting...' : 'Sign Up'}
      </button>
      <button type="button" className="btn btn-secondary w-full mt-2">
        Use Demo Account
      </button>
    </form>
  );
}
