import { XCircleIcon } from '@heroicons/react/24/solid';

type DateFilterProps = {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  handleDateKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
};

const DateFilter: React.FC<DateFilterProps> = ({
  selectedDate,
  setSelectedDate,
  handleDateKeyPress,
}) => {
  const clearDate = () => setSelectedDate('');

  return (
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
  );
};

export default DateFilter;
