type InputFieldProps = {
  label: string;
  type: string;
  placeholder: string;
  register: any;
  error?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: string;
};

const InputField: React.FC<InputFieldProps> = ({
  label,
  type,
  placeholder,
  register,
  error,
  className = '',
  min,
  max,
  step,
}) => (
  <div className={className}>
    <label className="block text-sm font-medium mb-1 text-left">{label}</label>
    <input
      type={type}
      className={`w-full px-4 py-2 bg-white text-gray-800 rounded border ${
        error ? 'border-red-500' : 'border-gray-300'
      } focus:outline-none focus:border-teal-500 focus:border-2 hover:border-teal-500 transition-colors duration-200 ease-in-out`}
      placeholder={placeholder}
      {...register}
      min={min}
      max={max}
      step={step}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export default InputField;
