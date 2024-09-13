import { XCircleIcon } from '@heroicons/react/24/solid';

type TransactionFiltersProps = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  transactionType: 'all' | 'income' | 'expense';
  setTransactionType: (type: 'all' | 'income' | 'expense') => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  handleDateJump: () => void;
  allLabels: string[];
  selectedLabels: string[];
  handleLabelToggle: (label: string) => void;
  setSelectedLabels: (labels: string[]) => void;
};

const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  transactionType,
  setTransactionType,
  selectedDate,
  setSelectedDate,
  handleDateJump,
  allLabels,
  selectedLabels,
  handleLabelToggle,
  setSelectedLabels,
}) => {
  const handleDateKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleDateJump();
    }
  };

  const handleDateBlur = () => {
    handleDateJump();
  };

  return (
    <>
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-4 lg:space-y-0">
        <div className="w-full lg:w-1/2">
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>
        <div className="w-full lg:w-1/2 flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as 'all' | 'income' | 'expense')}
            className="w-full sm:w-1/2 p-2 border border-gray-300 rounded"
          >
            <option value="all">All Transactions</option>
            <option value="income">Income Only</option>
            <option value="expense">Expenses Only</option>
          </select>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            onKeyPress={handleDateKeyPress}
            onBlur={handleDateBlur}
            className="w-full sm:w-1/2 p-2 border border-gray-300 rounded"
          />
        </div>
      </div>
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 items-center">
          {allLabels.map((label) => (
            <button
              key={label}
              onClick={() => handleLabelToggle(label)}
              className={`px-3 py-1 rounded transition-colors duration-200 ease-in-out ${
                selectedLabels.includes(label)
                  ? 'bg-teal-800 text-white hover:bg-teal-500'
                  : 'bg-gray-100 text-gray-800 hover:bg-teal-500 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
          {selectedLabels.length > 0 && (
            <button
              onClick={() => setSelectedLabels([])}
              className="p-1 rounded-full text-red-500 hover:text-red-600 transition-colors duration-200 ease-in-out"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          )}
        </div>
        <hr className="mt-4 mb-6 border-gray-300" />
      </div>
    </>
  );
};

export default TransactionFilters;
