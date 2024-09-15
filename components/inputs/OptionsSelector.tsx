import { XCircleIcon } from '@heroicons/react/24/solid';

type OptionsSelectorProps = {
  allOptions: string[];
  selectedOptions: string[];
  handleOptionToggle: (option: string) => void;
  setSelectedOptions: (options: string[]) => void;
  showNone: boolean;
  setShowNone: (show: boolean) => void;
};

const OptionsSelector: React.FC<OptionsSelectorProps> = ({
  allOptions,
  selectedOptions,
  handleOptionToggle,
  setSelectedOptions,
  showNone,
  setShowNone,
}) => {
  const resetFilters = () => {
    setSelectedOptions([]);
    setShowNone(false);
  };

  const renderOptionButton = (option: string) => {
    const isNoneOption = option === '';
    const isSelected = isNoneOption ? showNone : selectedOptions.includes(option);
    const onClick = isNoneOption ? () => setShowNone(!showNone) : () => handleOptionToggle(option);

    return (
      <button
        key={isNoneOption ? 'none-option' : option}
        onClick={onClick}
        className={`px-3 py-1 rounded transition-colors duration-200 ease-in-out ${
          isSelected
            ? 'bg-teal-800 text-white hover:bg-teal-500'
            : 'bg-gray-100 text-gray-800 hover:bg-teal-500 hover:text-white'
        }`}
      >
        {isNoneOption ? 'None' : option}
      </button>
    );
  };

  const renderResetButton = () => (
    <button
      onClick={resetFilters}
      className="p-1 rounded-full text-red-500 hover:text-red-600 transition-colors duration-200 ease-in-out"
    >
      <XCircleIcon className="h-6 w-6" />
    </button>
  );

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2 items-center">
        {allOptions.map((option: string) => renderOptionButton(option))}
        {renderOptionButton('')}
        {(selectedOptions.length > 0 || showNone) && renderResetButton()}
      </div>
      <hr className="mt-4 mb-6 border-gray-300" />
    </div>
  );
};

export default OptionsSelector;
