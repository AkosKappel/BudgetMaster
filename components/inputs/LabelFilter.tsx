import { XCircleIcon } from '@heroicons/react/24/solid';

type LabelFilterProps = {
  allLabels: string[];
  selectedLabels: string[];
  handleLabelToggle: (label: string) => void;
  setSelectedLabels: (labels: string[]) => void;
  showNoLabels: boolean;
  setShowNoLabels: (show: boolean) => void;
};

const LabelFilter: React.FC<LabelFilterProps> = ({
  allLabels,
  selectedLabels,
  handleLabelToggle,
  setSelectedLabels,
  showNoLabels,
  setShowNoLabels,
}) => {
  const resetFilters = () => {
    setSelectedLabels([]);
    setShowNoLabels(false);
  };

  const renderLabelButton = (label: string) => {
    const isNoLabels = label === '';
    const isSelected = isNoLabels ? showNoLabels : selectedLabels.includes(label);
    const onClick = isNoLabels
      ? () => setShowNoLabels(!showNoLabels)
      : () => handleLabelToggle(label);

    return (
      <button
        key={isNoLabels ? 'no-labels' : label}
        onClick={onClick}
        className={`px-3 py-1 rounded transition-colors duration-200 ease-in-out ${
          isSelected
            ? 'bg-teal-800 text-white hover:bg-teal-500'
            : 'bg-gray-100 text-gray-800 hover:bg-teal-500 hover:text-white'
        }`}
      >
        {isNoLabels ? 'No Labels' : label}
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
        {allLabels.map((label) => renderLabelButton(label))}
        {renderLabelButton('')}
        {(selectedLabels.length > 0 || showNoLabels) && renderResetButton()}
      </div>
      <hr className="mt-4 mb-6 border-gray-300" />
    </div>
  );
};

export default LabelFilter;
