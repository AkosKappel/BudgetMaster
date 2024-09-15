import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

type RangeSelectorProps = {
  minAmount: number;
  maxAmount: number;
  setMinAmount: (amount: number) => void;
  setMaxAmount: (amount: number) => void;
  range: { min: number; max: number };
  className?: string;
};

const RangeSelector: React.FC<RangeSelectorProps> = ({
  minAmount,
  maxAmount,
  setMinAmount,
  setMaxAmount,
  range,
  className,
}) => {
  const handleRangeChange = (value: number | number[]) => {
    if (Array.isArray(value)) {
      setMinAmount(value[0]);
      setMaxAmount(value[1] === range.max ? Infinity : value[1]);
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span>
          Price Range: ${minAmount} - ${maxAmount}
        </span>
      </div>
      <Slider
        range
        min={range.min}
        max={range.max}
        value={[minAmount, maxAmount === Infinity ? range.max : maxAmount]}
        onChange={handleRangeChange}
        className="mb-4"
      />
    </div>
  );
};

export default RangeSelector;
