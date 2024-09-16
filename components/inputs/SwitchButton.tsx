import Switch from 'react-switch';

type SwitchButtonProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  leftLabel: string;
  rightLabel: string;
  offColor?: string;
  onColor?: string;
  className?: string;
};

const SwitchButton: React.FC<SwitchButtonProps> = ({
  checked,
  onChange,
  leftLabel,
  rightLabel,
  offColor = '#f44336',
  onColor = '#4CAF50',
  className,
}) => (
  <div className={`flex items-center justify-center ${className}`}>
    <label className="flex items-center">
      <span className={`mr-2 ${!checked ? 'font-bold' : 'text-gray-500'}`}>{leftLabel}</span>
      <Switch
        checked={checked}
        onChange={onChange}
        offColor={offColor}
        onColor={onColor}
        uncheckedIcon={false}
        checkedIcon={false}
      />
      <span className={`ml-2 ${checked ? 'font-bold' : 'text-gray-500'}`}>{rightLabel}</span>
    </label>
  </div>
);

export default SwitchButton;
