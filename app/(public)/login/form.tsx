'use client';

import { useState } from 'react';
import { useActionState } from 'react';

import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

import { login } from '@/actions/auth';

type FormData = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const [state, loginAction, isPending] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({ email: '', password: '' });

  const isFormValid = !!(formData.email && formData.password);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form action={loginAction} className="space-y-4">
      <div className="form-control">
        <label htmlFor="email" className="label">
          <span className="label-text">Email</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
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
            className="input input-bordered focus:outline-none focus:border-teal-500 focus:border-2 hover:border-teal-500 transition-colors duration-200 ease-in-out w-full pr-10"
            value={formData.password}
            onChange={handleInputChange}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
        </div>
        {state?.errors?.password && <p className="mt-1 text-sm text-error">{state.errors.password}</p>}
      </div>
      {state?.message && <p className="mt-1 text-sm text-error">{state.message}</p>}
      <button
        aria-disabled={!isFormValid || isPending}
        type="submit"
        className="btn btn-primary w-full"
        disabled={!isFormValid || isPending}
      >
        {isPending ? 'Submitting...' : 'Login'}
      </button>
    </form>
  );
}
