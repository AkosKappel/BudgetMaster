import { XCircleIcon } from '@heroicons/react/24/solid';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

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
  minAmount: number;
  maxAmount: number;
  setMinAmount: (amount: number) => void;
  setMaxAmount: (amount: number) => void;
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
  minAmount,
  maxAmount,
  setMinAmount,
  setMaxAmount,
}) => {
  const handleDateKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleDateJump();
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const clearDate = () => {
    setSelectedDate('');
  };

  const handleRangeChange = (value: number | number[]) => {
    if (Array.isArray(value)) {
      setMinAmount(value[0]);
      setMaxAmount(value[1]);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setTransactionType('all');
    setSelectedDate('');
    setSelectedLabels([]);
    setMinAmount(0);
    setMaxAmount(10000);
  };

  return (
    <>
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-4 lg:space-y-0">
        <div className="w-full lg:w-1/2 relative">
          <input
            type="text"
            placeholder="Search for title, description, sender, or receiver..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded pr-10"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <XCircleIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="w-full lg:w-1/2 flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
          <select
            value={transactionType}
            onChange={(e) => setTransactionType(e.target.value as 'all' | 'income' | 'expense')}
            className="w-full sm:w-2/5 p-2 border border-gray-300 rounded appearance-none bg-white"
          >
            <option value="all">All Transactions</option>
            <option value="income">Income Only</option>
            <option value="expense">Expenses Only</option>
          </select>
          <div className="relative w-full sm:w-2/5">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              onKeyPress={handleDateKeyPress}
              className="w-full p-2 border border-gray-300 rounded pr-10"
              title="Press Enter to jump to the selected date"
            />
            {selectedDate && (
              <button
                onClick={clearDate}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            )}
          </div>
          <button
            onClick={resetFilters}
            className="w-full sm:w-1/5 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors duration-200 ease-in-out"
          >
            Reset
          </button>
        </div>
      </div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span>
            Price Range: ${minAmount} - ${maxAmount}
          </span>
        </div>
        <Slider
          range
          min={0}
          max={10000}
          value={[minAmount, maxAmount]}
          onChange={handleRangeChange}
          className="mb-4"
        />
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
