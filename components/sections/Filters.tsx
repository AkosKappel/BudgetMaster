import { useSelector } from 'react-redux';

import DatePicker from '@/components/inputs/DatePicker';
import Dropdown from '@/components/inputs/Dropdown';
import OptionsSelector from '@/components/inputs/OptionsSelector';
import RangeSelector from '@/components/inputs/RangeSelector';
import SearchFilter from '@/components/inputs/SearchField';
import { RootState } from '@/store';

type FiltersProps = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  transactionType: 'all' | 'income' | 'expense';
  setTransactionType: (type: 'all' | 'income' | 'expense') => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  handleDateJump: () => void;
  selectedLabels: string[];
  setSelectedLabels: (labels: string[] | ((prev: string[]) => string[])) => void;
  minAmount: number;
  maxAmount: number;
  setMinAmount: (amount: number) => void;
  setMaxAmount: (amount: number) => void;
  showNoLabels: boolean;
  setShowNoLabels: (show: boolean) => void;
};

const Filters: React.FC<FiltersProps> = ({
  searchTerm,
  setSearchTerm,
  transactionType,
  setTransactionType,
  selectedDate,
  setSelectedDate,
  handleDateJump,
  selectedLabels,
  setSelectedLabels,
  minAmount,
  maxAmount,
  setMinAmount,
  setMaxAmount,
  showNoLabels,
  setShowNoLabels,
}) => {
  const amountRange = { min: 0, max: 10_000 };
  const transactionTypeOptions = [
    { value: 'all', label: 'All Transactions' },
    { value: 'income', label: 'Income Only' },
    { value: 'expense', label: 'Expenses Only' },
  ];
  const uniqueLabels = useSelector((state: RootState) => state.transactions.uniqueLabels);

  const handleLabelToggle = (label: string) => {
    setSelectedLabels((prev: string[]) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label],
    );
  };

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
    setShowNoLabels(false);
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-12 gap-4 w-full">
        <SearchFilter
          value={searchTerm}
          setValue={setSearchTerm}
          placeholder="Search for title, description, sender, or receiver..."
          className="col-span-12 sm:col-span-12 lg:col-span-4 xl:col-span-6"
        />
        <Dropdown
          value={transactionType}
          onChange={setTransactionType}
          options={transactionTypeOptions}
          className="col-span-12 sm:col-span-4 lg:col-span-3 xl:col-span-2"
        />
        <DatePicker
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          handleDateKeyPress={handleDateKeyPress}
          className="col-span-12 sm:col-span-4 lg:col-span-3 xl:col-span-2"
        />
        <button
          onClick={resetFilters}
          className="col-span-12 sm:col-span-4 lg:col-span-2 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors duration-200 ease-in-out"
        >
          Reset
        </button>
      </div>
      <RangeSelector
        minAmount={minAmount}
        maxAmount={maxAmount}
        setMinAmount={setMinAmount}
        setMaxAmount={setMaxAmount}
        range={amountRange}
      />
      <OptionsSelector
        allOptions={uniqueLabels}
        selectedOptions={selectedLabels}
        handleOptionToggle={handleLabelToggle}
        setSelectedOptions={setSelectedLabels}
        showNone={showNoLabels}
        setShowNone={setShowNoLabels}
      />
    </>
  );
};

export default Filters;
