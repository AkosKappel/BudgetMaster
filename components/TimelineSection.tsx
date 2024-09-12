import { Transaction } from '@/types';

type TimelineSectionProps = {
  transactions: Transaction[];
  isIncome: boolean;
};

const TimelineSection: React.FC<TimelineSectionProps> = ({ transactions, isIncome }) => {
  const color = isIncome ? 'green' : 'red';

  return (
    <section className={`timeline-${isIncome ? 'start' : 'end'} ${isIncome ? 'md:text-end' : ''}`}>
      {transactions.map((transaction: Transaction) => (
        <div
          key={transaction.title}
          className={`mb-4 flex justify-start ${isIncome ? 'md:justify-end' : ''}`}
        >
          <div className={`px-4 py-2 rounded-lg shadow-md bg-${color}-100 inline-block`}>
            <div
              className={`text-lg font-semibold whitespace-nowrap flex justify-start items-center ${
                isIncome ? 'md:justify-end' : ''
              }`}
            >
              <h3 className="text-gray-800 mr-3">{transaction.title}</h3>
              <span className="text-sm text-gray-600">
                {`${isIncome ? '+' : '-'} ${transaction.amount.toFixed(2)}`}
              </span>
            </div>
            <div className="text-gray-700 mt-1">{transaction.description}</div>
            <div className="text-sm text-gray-600 mt-2">
              {transaction.sender && <div>From: {transaction.sender}</div>}
              {transaction.receiver && <div>To: {transaction.receiver}</div>}
            </div>
            {transaction.labels.length > 0 && (
              <div
                className={`flex flex-wrap mt-2 justify-start gap-1 ${isIncome ? 'md:justify-end' : ''}`}
              >
                {transaction.labels.map((label) => (
                  <span
                    key={`${transaction.title}-${label}`}
                    className={`bg-${color}-200 text-${color}-800 text-xs px-2 py-1 rounded`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
};

export default TimelineSection;
