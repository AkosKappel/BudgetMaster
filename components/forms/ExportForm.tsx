import React from 'react';

// TODO: Implement export form
type ExportFormProps = {
  onSubmitCallback: () => void;
};

const ExportForm: React.FC<ExportFormProps> = ({ onSubmitCallback }) => {
  return (
    <>
      <h2 className="text-2xl font-bold mb-4">Export Transactions</h2>
      <div>Export Form (WIP)</div>
    </>
  );
};

export default ExportForm;
