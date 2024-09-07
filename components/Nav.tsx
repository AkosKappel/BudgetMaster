import Link from 'next/link';

const Nav = () => {
  return (
    <nav className="bg-base-100 shadow-md">
      <div className="container mx-auto p-4">
        <ul className="flex space-x-4">
          <li>
            <Link
              href="/dashboard"
              className="text-base font-medium hover:text-primary hover:bg-primary-content hover:scale-105 transition-all duration-300 p-2 rounded-lg"
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              href="/expenses"
              className="text-base font-medium hover:text-primary hover:bg-primary-content hover:scale-105 transition-all duration-300 p-2 rounded-lg"
            >
              Expenses
            </Link>
          </li>
          <li>
            <Link
              href="/reports"
              className="text-base font-medium hover:text-primary hover:bg-primary-content hover:scale-105 transition-all duration-300 p-2 rounded-lg"
            >
              Reports
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Nav;
