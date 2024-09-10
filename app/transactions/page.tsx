// import { Transaction } from '@/types';

type Transaction = {
  id: number;
  date: string;
  title: string;
  description: string;
  amount: number;
  isExpense: boolean;
};

type TransactionsPageProps = {
  transactions: Transaction[];
};

const transactions: Transaction[] = [
  {
    id: 1,
    date: '2024-01-01',
    title: 'Salary',
    description: 'Received salary for January',
    amount: 5000,
    isExpense: false,
  },
  {
    id: 2,
    date: '2024-01-05',
    title: 'Groceries',
    description: 'Purchased groceries',
    amount: 200,
    isExpense: true,
  },
  {
    id: 3,
    date: '2024-01-10',
    title: 'Dinner',
    description: 'Dinner with friends',
    amount: 100,
    isExpense: true,
  },
];

const TransactionsPage: React.FC<TransactionsPageProps> = () => {
  return (
    <ul className="timeline timeline-snap-icon max-md:timeline-compact timeline-vertical">
      {transactions.map((transaction, index) => (
        <li key={transaction.id}>
          <hr />
          <div className="timeline-middle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-6 w-6 ${transaction.isExpense ? 'text-red-500' : 'text-green-500'}`}
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className={`timeline-${index % 2 === 0 ? 'start md:text-end' : 'end'} mb-10`}>
            <time className="font-mono text-gray-500 italic block mb-1">
              {new Date(transaction.date).toLocaleDateString()}
            </time>
            <div className={`px-4 py-2 rounded-lg shadow-md ${transaction.isExpense ? 'bg-red-100' : 'bg-green-100'}`}>
              <div className="text-lg font-semibold">{transaction.title}</div>
              <p className="text-gray-700 mt-1">{transaction.description}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">
                  <strong>Amount:</strong> ${transaction.amount.toFixed(2)}
                </span>
                <span
                  className={`inline-block px-2 py-1 text-sm font-bold rounded-full ${
                    transaction.isExpense ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                  }`}
                >
                  {transaction.isExpense ? 'Expense' : 'Income'}
                </span>
              </div>
            </div>
          </div>
          {index !== transactions.length - 1 && <hr />}
        </li>
      ))}
    </ul>
  );
};

export default TransactionsPage;
