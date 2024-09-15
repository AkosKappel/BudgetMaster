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
      className="w-full p-2 pr-8 border rounded appearance-none border-gray-300 bg-white focus:outline-none focus:border-teal-500 focus:border-2 hover:border-teal-500 transition-colors duration-200 ease-in-out"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} className="hover:bg-teal-500">
          {option.label}
        </option>
      ))}
    </select>
    <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
  </div>
);

export default Dropdown;
