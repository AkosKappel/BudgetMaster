import React from 'react';
import { toast } from 'react-toastify';

// TODO: Implement export form
type ExportFormProps = {
  onSubmitCallback: () => void;
};

const ExportForm: React.FC<ExportFormProps> = ({ onSubmitCallback }) => {
  const handleExport = () => {
    // Implement export logic here
    // For now, we'll just show a success message
    toast.success('Data exported successfully');
    onSubmitCallback();
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">Export Transactions</h2>
      <div>Export Form (WIP)</div>
      <button onClick={handleExport} className="btn btn-primary mt-4">
        Export
      </button>
    </>
  );
};

export default ExportForm;
