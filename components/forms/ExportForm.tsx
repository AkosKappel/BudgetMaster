import React from 'react';

import Modal from '@/components/sections/Modal';

type ExportFormProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ExportForm: React.FC<ExportFormProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Transactions">
      <div>ExportForm</div>
    </Modal>
  );
};

export default ExportForm;
