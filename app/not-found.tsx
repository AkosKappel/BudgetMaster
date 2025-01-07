import Link from 'next/link';

const NotFoundPage = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary">404</h1>
        <p className="text-2xl font-semibold mt-4 text-base-content">Oops! Page not found</p>
        <p className="text-base mt-2">It seems like the page you are looking for doesn&apos;t exist.</p>
        <Link href="/" className="mt-6 btn btn-primary">
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
