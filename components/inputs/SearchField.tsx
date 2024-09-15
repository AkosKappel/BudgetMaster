import { XCircleIcon } from '@heroicons/react/24/solid';

type SearchFieldProps = {
  value: string;
  setValue: (x: string) => void;
  placeholder?: string;
  className?: string;
};

const SearchField: React.FC<SearchFieldProps> = ({
  value,
  setValue,
  placeholder = 'Search...',
  className,
}) => {
  const clearSearch = () => setValue('');

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={`w-full p-2 border border-gray-300 rounded pr-10 focus:outline-none focus:border-teal-500 focus:border-2 hover:border-teal-500 transition-colors duration-200 ease-in-out`}
      />
      {value && (
        <button
          onClick={clearSearch}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          <XCircleIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default SearchField;
