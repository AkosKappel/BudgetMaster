import { Transaction, groupedTransactions, transactions } from '@/app/types';

type TransactionsPageProps = {
  transactions: Transaction[];
};

const TransactionsPage: React.FC<TransactionsPageProps> = (props) => {
  return (
    <ul className="timeline timeline-snap-icon max-md:timeline-compact timeline-vertical">
      {Object.entries(groupedTransactions).map(([date, transactions], index) => (
        <li key={date}>
          <hr />
          <div className="timeline-middle">
            <time className="font-mono text-gray-500 italic block mb-1 mx-2">{date}</time>
          </div>
          <div className="timeline-start md:text-end">
            {transactions
              .filter((t) => !t.isExpense)
              .map((transaction: Transaction) => (
                <div key={transaction.title} className="mb-4 flex justify-start md:justify-end">
                  <div className="px-4 py-2 rounded-lg shadow-md bg-green-100 inline-block">
                    <div className="text-lg font-semibold whitespace-nowrap flex justify-start md:justify-end items-center">
                      <h3 className="text-gray-800 mr-3">{transaction.title}</h3>
                      <span className="text-sm text-gray-600">+ ${transaction.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-gray-700 mt-1">{transaction.description}</div>
                    <div className="text-sm text-gray-600 mt-2">
                      {transaction.sender && <div>From: {transaction.sender}</div>}
                      {transaction.receiver && <div>To: {transaction.receiver}</div>}
                    </div>
                    {transaction.labels.length > 0 && (
                      <div className="flex flex-wrap mt-2 justify-start md:justify-end gap-1">
                        {transaction.labels.map((label, i) => (
                          <span key={i} className="bg-green-200 text-green-800 text-xs px-2 py-1 rounded">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
          <div className="timeline-end">
            {transactions
              .filter((t) => t.isExpense)
              .map((transaction: Transaction) => (
                <div key={transaction.title} className="mb-4 flex justify-start">
                  <div className="px-4 py-2 rounded-lg shadow-md bg-red-100 inline-block">
                    <div className="text-lg font-semibold whitespace-nowrap flex justify-start items-center">
                      <h3 className="text-gray-800 mr-3">{transaction.title}</h3>
                      <span className="text-sm text-gray-600">- ${transaction.amount.toFixed(2)}</span>
                    </div>
                    <div className="text-gray-700 mt-1">{transaction.description}</div>
                    <div className="text-sm text-gray-600 mt-2">
                      {transaction.sender && <div>From: {transaction.sender}</div>}
                      {transaction.receiver && <div>To: {transaction.receiver}</div>}
                    </div>
                    {transaction.labels.length > 0 && (
                      <div className="flex flex-wrap mt-2 justify-start gap-1">
                        {transaction.labels.map((label, i) => (
                          <span key={i} className="bg-red-200 text-red-800 text-xs px-2 py-1 rounded">
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
          <hr className="my-8" />
        </li>
      ))}
    </ul>
  );
};

{
  /* {transactions.map((transaction: Transaction, index: number) => (
        <li key={transaction.title}>
          <hr />
          <div className={`timeline-${!transaction.isExpense ? 'start md:text-end' : 'end'} mb-10`}></div>
          <div className="timeline-middle">
            <time className="font-mono text-gray-500 italic block mb-1">
              {new Date(transaction.date).toLocaleDateString()}
            </time>
          </div>
          <div className={`timeline-${transaction.isExpense ? 'start md:text-end' : 'end'} mb-10`}>
            <div className={`px-4 py-2 rounded-lg shadow-md ${transaction.isExpense ? 'bg-red-100' : 'bg-green-100'}`}>
              <div className="text-lg font-semibold">
                <h3 className="text-gray-800">{transaction.title}</h3>
                <span className="text-sm text-gray-600">
                  {transaction.isExpense ? '-' : '+'} ${transaction.amount.toFixed(2)}
                </span>
              </div>
              <p className="text-gray-700 mt-1">{transaction.description}</p>
              <div className="flex justify-between items-center mt-2">
                <span
                  className={`inline-block px-2 py-1 mx-2 text-sm font-bold rounded-full ${
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
      ))} */
}
//     </ul>
//   );
// };

export default TransactionsPage;
