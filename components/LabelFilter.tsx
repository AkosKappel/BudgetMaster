import { XCircleIcon } from '@heroicons/react/24/solid';

type LabelFilterProps = {
  allLabels: string[];
  selectedLabels: string[];
  handleLabelToggle: (label: string) => void;
  setSelectedLabels: (labels: string[]) => void;
};

const LabelFilter: React.FC<LabelFilterProps> = ({
  allLabels,
  selectedLabels,
  handleLabelToggle,
  setSelectedLabels,
}) => (
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
);

export default LabelFilter;
