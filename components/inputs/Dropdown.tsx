import { ChevronDownIcon } from '@heroicons/react/20/solid';

type DropdownOption = {
  value: string;
  label: string;
};

type DropdownProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption[];
  className?: string;
};

const Dropdown = <T extends string>({ value, onChange, options, className }: DropdownProps<T>) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full p-2 pr-8 border rounded appearance-none border-gray-300 bg-white"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
  </div>
);

export default Dropdown;
