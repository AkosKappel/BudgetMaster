import AmountFilter from '@/components/AmountFilter';
import DateFilter from '@/components/DateFilter';
import LabelFilter from '@/components/LabelFilter';
import SearchFilter from '@/components/SearchFilter';
import TypeFilter from '@/components/TypeFilter';

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
  const amountRange = { min: 0, max: 10_000 };
  const transactionTypeOptions = [
    { value: 'all', label: 'All Transactions' },
    { value: 'income', label: 'Income Only' },
    { value: 'expense', label: 'Expenses Only' },
  ];

  const handleDateKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleDateJump();
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setTransactionType('all');
    setSelectedDate('');
    setSelectedLabels([]);
    setMinAmount(0);
    setMaxAmount(Infinity);
  };

  return (
    <>
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center lg:space-x-4 space-y-4 lg:space-y-0">
        <SearchFilter
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          placeholder="Search for title, description, sender, or receiver..."
        />
        <div className="w-full lg:w-1/2 flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
          <TypeFilter
            value={transactionType}
            onChange={setTransactionType}
            options={transactionTypeOptions}
          />
          <DateFilter
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            handleDateKeyPress={handleDateKeyPress}
          />
          <button
            onClick={resetFilters}
            className="w-full sm:w-1/5 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors duration-200 ease-in-out"
          >
            Reset
          </button>
        </div>
      </div>
      <AmountFilter
        minAmount={minAmount}
        maxAmount={maxAmount}
        setMinAmount={setMinAmount}
        setMaxAmount={setMaxAmount}
        range={amountRange}
      />
      <LabelFilter
        allLabels={allLabels}
        selectedLabels={selectedLabels}
        handleLabelToggle={handleLabelToggle}
        setSelectedLabels={setSelectedLabels}
      />
    </>
  );
};

export default TransactionFilters;
