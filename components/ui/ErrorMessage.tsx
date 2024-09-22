import { ExclamationTriangleIcon } from '@heroicons/react/24/solid';

type ErrorMessageProps = {
  message: string;
  onRetry?: () => void;
  className?: string;
};

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry, className }) => (
  <div
    className={`flex items-center justify-center p-4 bg-red-100 border border-red-400 rounded-lg ${className}`}
  >
    <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-2" />
    <span className="text-red-700">{message}</span>
    {onRetry && (
      <button
        onClick={onRetry}
        className="ml-4 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);

export default ErrorMessage;