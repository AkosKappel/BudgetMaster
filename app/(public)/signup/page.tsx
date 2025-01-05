import Link from 'next/link';

import SignupForm from '@/app/(public)/signup/form';

export default function SignupPage() {
  return (
    <div className="flex flex-col items-center min-h-screen bg-base-200 mt-12">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-primary">Create an account</h2>
        </div>
        <SignupForm />
        <div className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link className="font-medium text-primary hover:underline" href="/login">
            <b>Login</b>
          </Link>
        </div>
      </div>
    </div>
  );
}
