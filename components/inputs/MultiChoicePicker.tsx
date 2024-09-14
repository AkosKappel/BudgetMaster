import { XCircleIcon } from '@heroicons/react/24/solid';

type MultiChoicePickerProps = {
  allChoices: string[];
  selectedChoices: string[];
  handleChoiceToggle: (choice: string) => void;
  setSelectedChoices: (options: string[]) => void;
  showNone: boolean;
  setShowNone: (show: boolean) => void;
};

const MultiChoicePicker: React.FC<MultiChoicePickerProps> = ({
  allChoices,
  selectedChoices,
  handleChoiceToggle,
  setSelectedChoices,
  showNone,
  setShowNone,
}) => {
  const resetFilters = () => {
    setSelectedChoices([]);
    setShowNone(false);
  };

  const renderOptionButton = (option: string) => {
    const isNoOptions = option === '';
    const isSelected = isNoOptions ? showNone : selectedChoices.includes(option);
    const onClick = isNoOptions ? () => setShowNone(!showNone) : () => handleChoiceToggle(option);

    return (
      <button
        key={isNoOptions ? 'no-options' : option}
        onClick={onClick}
        className={`px-3 py-1 rounded transition-colors duration-200 ease-in-out ${
          isSelected
            ? 'bg-teal-800 text-white hover:bg-teal-500'
            : 'bg-gray-100 text-gray-800 hover:bg-teal-500 hover:text-white'
        }`}
      >
        {isNoOptions ? 'No labels' : option}
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
        {allChoices.map((option) => renderOptionButton(option))}
        {renderOptionButton('')}
        {(selectedChoices.length > 0 || showNone) && renderResetButton()}
      </div>
      <hr className="mt-4 mb-6 border-gray-300" />
    </div>
  );
};

export default MultiChoicePicker;
