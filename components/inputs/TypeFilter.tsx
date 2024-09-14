type TypeFilterProps = {
  value: 'all' | 'income' | 'expense';
  onChange: (type: 'all' | 'income' | 'expense') => void;
  options: { value: string; label: string }[];
};

const TypeFilter: React.FC<TypeFilterProps> = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value as 'all' | 'income' | 'expense')}
    className="w-full sm:w-2/5 p-2 border border-gray-300 rounded appearance-none bg-white"
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

export default TypeFilter;
