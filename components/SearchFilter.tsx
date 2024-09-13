import { XCircleIcon } from '@heroicons/react/24/solid';

type SearchFilterProps = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  placeholder: string;
};

const SearchFilter: React.FC<SearchFilterProps> = ({ searchTerm, setSearchTerm, placeholder }) => {
  const clearSearch = () => setSearchTerm('');

  return (
    <div className="w-full lg:w-1/2 relative">
      <input
        type="text"
        placeholder={placeholder}
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
  );
};

export default SearchFilter;
