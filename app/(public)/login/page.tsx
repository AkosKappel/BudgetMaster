import Link from 'next/link';

import LoginForm from '@/app/(public)/login/form';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-base-200 mt-24">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Login</h1>
        </div>
        <LoginForm />
        <div className="text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link className="font-medium text-primary hover:underline" href="/signup">
            <b>Sign up</b>
          </Link>
        </div>
      </div>
    </div>
  );
}
