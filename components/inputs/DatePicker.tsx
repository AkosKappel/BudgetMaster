import { XCircleIcon } from '@heroicons/react/24/solid';

type DatePickerProps = {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  handleDateKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
};

const DatePicker: React.FC<DatePickerProps> = ({
  selectedDate,
  setSelectedDate,
  handleDateKeyPress,
  placeholder = 'Select a date',
  className,
}) => {
  const clearDate = () => setSelectedDate('');

  return (
    <div className={`relative ${className}`}>
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
        onKeyPress={handleDateKeyPress}
        className="w-full p-2 border border-gray-300 rounded pr-10 focus:outline-none focus:border-teal-500 focus:border-2 hover:border-teal-500 transition-colors duration-200 ease-in-out"
        title="Press Enter to jump to the selected date"
        placeholder={placeholder}
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

export default DatePicker;
