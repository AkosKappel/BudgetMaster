import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import CreatableSelect from 'react-select/creatable';
import Switch from 'react-switch';

import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';

import Modal from '@/components/Modal';
import { TransactionData, transactionSchema } from '@/schemas/transaction';

type ModalTransactionProps = {
  isOpen: boolean;
  onClose: () => void;
  transaction: TransactionData | null;
};

const ModalTransaction: React.FC<ModalTransactionProps> = ({ isOpen, onClose, transaction }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
    watch,
  } = useForm<TransactionData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      isExpense: true,
      labels: [],
    },
  });

  useEffect(() => {
    if (transaction) {
      Object.entries(transaction).forEach(([key, value]) => {
        setValue(key as keyof TransactionData, value);
      });
    }
  }, [transaction, setValue]);

  const isExpense = watch('isExpense', true);

  const onSubmit = async (data: TransactionData) => {
    try {
      setLoading(true);
      let response;
      if (transaction) {
        // Edit existing transaction
        response = await axios.put(`/api/transactions/${transaction.id}`, data);
        if (response.status !== 200) {
          throw new Error('Failed to update transaction');
        }
        console.log('Transaction updated successfully', response.data);
      } else {
        // Create new transaction
        response = await axios.post('/api/transactions', data);
        if (response.status !== 201) {
          throw new Error('Failed to add transaction');
        }
        console.log('Transaction added successfully', response.data);
      }
      reset();
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onDelete = async () => {
    if (!transaction || !transaction.id) return;
    try {
      setLoading(true);
      const response = await axios.delete(`/api/transactions/${transaction.id}`);
      if (response.status !== 200) {
        throw new Error('Failed to delete transaction');
      }
      onClose();
      console.log('Transaction deleted successfully');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (transaction) {
      // Reset to initial transaction values in editing mode
      Object.entries(transaction).forEach(([key, value]) => {
        setValue(key as keyof TransactionData, value);
      });
    } else {
      // Reset to default values in creation mode
      reset();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transaction ? 'Edit Transaction' : 'Add Transaction'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-left">Title</label>
          <input
            type="text"
            className={`w-full px-4 py-2 bg-white text-gray-800 rounded border ${errors.title ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-blue-500`}
            placeholder="Transaction name"
            {...register('title')}
          />
          {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-left">Amount (€)</label>
            <input
              type="number"
              step="0.01"
              className={`w-full px-4 py-2 bg-white text-gray-800 rounded border ${errors.amount ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-blue-500`}
              placeholder="0.00 €"
              min={0}
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-left">Date</label>
            <input
              type="date"
              className={`w-full px-4 py-2 bg-white text-gray-800 rounded border ${errors.date ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-blue-500`}
              {...register('date')}
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
          </div>
          <div className="flex items-center justify-center">
            <label className="flex items-center">
              <span className={`mr-2 ${isExpense ? 'font-bold' : 'text-gray-500'}`}>Expense</span>
              <Switch
                checked={!isExpense}
                onChange={() => setValue('isExpense', !isExpense)}
                offColor="#f44336"
                onColor="#4CAF50"
                uncheckedIcon={false}
                checkedIcon={false}
              />
              <span className={`ml-2 ${!isExpense ? 'font-bold' : 'text-gray-500'}`}>Income</span>
            </label>
          </div>
        </div>
        <div className={`transition-all ${isCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-full'}`}>
          <div>
            <label className="block text-sm font-medium mb-1 text-left">Description</label>
            <input
              type="text"
              className="w-full px-4 py-2 bg-white text-gray-800 rounded border border-gray-300 focus:outline-none focus:border-blue-500"
              placeholder="Details (optional)"
              {...register('description')}
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1 text-left">Labels</label>
            <Controller
              control={control}
              name="labels"
              render={({ field }) => (
                <CreatableSelect
                  isMulti
                  className="react-select-container"
                  classNamePrefix="react-select"
                  styles={{
                    control: (provided) => ({
                      ...provided,
                      backgroundColor: 'white',
                      borderColor: 'rgb(209 213 219)',
                      '&:hover': {
                        borderColor: 'rgb(59 130 246)',
                      },
                    }),
                    placeholder: (provided) => ({
                      ...provided,
                      color: 'rgb(156 163 175)',
                    }),
                  }}
                  onChange={(val) => field.onChange(val.map((v) => v.value))}
                  value={(field.value || []).map((label) => ({ label, value: label }))}
                  placeholder="Add labels such as 'Shopping', 'Salary', 'Cinema'..."
                />
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-left">Sender</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-white text-gray-800 rounded border border-gray-300 focus:outline-none focus:border-blue-500"
                placeholder="Sender name (optional)"
                {...register('sender')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-left">Receiver</label>
              <input
                type="text"
                className="w-full px-4 py-2 bg-white text-gray-800 rounded border border-gray-300 focus:outline-none focus:border-blue-500"
                placeholder="Receiver name (optional)"
                {...register('receiver')}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <button
            type="button"
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors duration-200 ease-in-out"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? '▼ Show More' : '▲ Show Less'}
          </button>
          <div className="flex space-x-2">
            {transaction && (
              <button
                type="button"
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200 ease-in-out"
                onClick={onDelete}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors duration-200 ease-in-out"
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded btn btn-primary transition-colors duration-200 ease-in-out"
              disabled={loading}
            >
              {loading ? 'Saving...' : transaction ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ModalTransaction;
