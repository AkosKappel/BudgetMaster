import { useState } from 'react';

import { PencilIcon } from '@heroicons/react/24/solid';

import TransactionForm from '@/components/forms/TransactionForm';
import Modal from '@/components/sections/Modal';
import { formatPrice } from '@/lib/utils';
import { type Transaction } from '@/types';

type TimelineSectionProps = {
  transactions: Transaction[];
  isIncome: boolean;
};

const TimelineSection: React.FC<TimelineSectionProps> = ({ transactions, isIncome }) => {
  const [currentTransaction, setCurrentTransaction] = useState<Transaction | null>(null);

  const openEditModal = (transaction: Transaction) => {
    setCurrentTransaction(transaction);
  };

  const closeEditModal = () => {
    setCurrentTransaction(null);
  };

  return (
    <>
      <section
        className={`timeline-${isIncome ? 'start' : 'end'} ${isIncome ? 'md:text-end' : ''}`}
      >
        {transactions.map((transaction: Transaction) => (
          <div
            key={`${transaction.title}-${transaction.date}`}
            className={`mb-4 flex justify-start ${isIncome ? 'md:justify-end' : ''}`}
          >
            <div
              onClick={() => openEditModal(transaction)}
              className={`px-4 py-2 rounded-lg shadow-md inline-block w-full md:w-auto relative group transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg hover:bg-opacity-90 hover:cursor-pointer
                ${isIncome ? 'bg-green-200 hover:bg-green-300' : 'bg-red-200 hover:bg-red-300'} `}
            >
              <div
                title="Edit transaction"
                className="absolute top-2 right-2 p-1 rounded-full bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <PencilIcon className="h-4 w-4 text-gray-600" />
              </div>
              <div
                className={`text-lg font-semibold flex flex-col md:flex-row items-start md:items-center
                  ${isIncome ? 'md:justify-end' : ''}`}
              >
                <h3 className="text-gray-800 mr-0 md:mr-3 mb-2 md:mb-0">{transaction.title}</h3>
                <span className="text-base text-gray-600 font-semibold whitespace-nowrap">
                  {`${isIncome ? '+' : '-'} ${formatPrice(transaction.amount)}`}
                </span>
              </div>
              <div className="text-gray-700 mt-1">{transaction.description}</div>
              <div
                className={`text-sm text-gray-600 mt-2 flex flex-col md:flex-row items-start md:items-center my-2
                ${isIncome ? 'md:justify-end' : ''}`}
              >
                {transaction.sender && (
                  <span className="mb-1 md:mb-0">From: {transaction.sender}</span>
                )}
                {transaction.sender && transaction.receiver && (
                  <span className="hidden md:inline mx-2">|</span>
                )}
                {transaction.receiver && <span>To: {transaction.receiver}</span>}
              </div>
              {transaction.labels.length > 0 && (
                <div
                  className={`flex flex-wrap mt-2 justify-start gap-2 ${isIncome ? 'md:justify-end' : ''}`}
                >
                  {transaction.labels.map((label) => (
                    <span
                      key={`${transaction.title}-${label}`}
                      className={
                        isIncome
                          ? 'bg-green-400 text-green-800 text-xs px-2 py-1 rounded font-semibold'
                          : 'bg-red-400 text-red-800 text-xs px-2 py-1 rounded font-semibold'
                      }
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
      <Modal isOpen={!!currentTransaction} onClose={closeEditModal}>
        <TransactionForm
          onSubmitCallback={closeEditModal}
          onDeleteCallback={closeEditModal}
          transaction={currentTransaction}
          startCollapsed={false}
        />
      </Modal>
    </>
  );
};

export default TimelineSection;
