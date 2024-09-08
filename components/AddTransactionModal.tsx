import React from 'react';
import Modal from '@/components/Modal';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Transaction">
      <form>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Transaction Name</label>
          <input type="text" className="input input-bordered w-full" placeholder="Enter transaction name" />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Amount</label>
          <input type="number" className="input input-bordered w-full" placeholder="Enter amount" />
        </div>
        <button type="button" className="btn btn-primary mt-4" onClick={onClose}>
          Create
        </button>
      </form>
    </Modal>
  );
};

export default AddTransactionModal;
