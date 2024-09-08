'use client';

import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import CreatableSelect from 'react-select/creatable';
import Switch from 'react-switch';

import Modal from '@/components/Modal';
import { TransactionData, transactionSchema } from '@/schemas/transaction';
import { PlusIcon } from '@heroicons/react/24/solid';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';

const AddTransaction: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

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

  const isExpense = watch('isExpense', true);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
  };

  const onSubmit = async (data: TransactionData) => {
    try {
      const response = await axios.post('/api/transactions', data);
      if (response.status !== 201) {
        throw new Error('Failed to add transaction');
      }
      reset();
      closeModal();
      console.log('Transaction added successfully', response.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <div className="fixed bottom-5 right-5">
        <button className="btn btn-secondary shadow flex items-center space-x-2" onClick={openModal}>
          <PlusIcon className="w-5 h-5" />
          <span>Add Transaction</span>
        </button>
      </div>
      <Modal isOpen={isModalOpen} onClose={closeModal} title="Add Transaction">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              className={`input input-bordered w-full ${errors.title ? 'input-error' : ''}`}
              placeholder="Transaction name"
              {...register('title')}
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (€)</label>
              <input
                type="number"
                step="0.01"
                className={`input input-bordered w-full ${errors.amount ? 'input-error' : ''}`}
                placeholder="0.00 €"
                min={0}
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                className={`input input-bordered w-full ${errors.date ? 'input-error' : ''}`}
                {...register('date')}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
            </div>
            <div className="flex justify-center items-end mb-3 space-x-2">
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
          {!isCollapsed && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Details (optional)"
                  {...register('description')}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Labels</label>
                <Controller
                  control={control}
                  name="labels"
                  render={({ field }) => (
                    <CreatableSelect
                      isMulti
                      className="react-select-container"
                      classNamePrefix="react-select"
                      styles={{
                        valueContainer: (provided) => ({
                          ...provided,
                          padding: '0.25rem 0.5rem',
                        }),
                        input: (provided) => ({
                          ...provided,
                          color: 'blue',
                          '&::placeholder': {
                            color: 'turquoise',
                          },
                        }),
                      }}
                      onChange={(val) => field.onChange(val.map((v) => v.value))}
                      value={(field.value || []).map((label) => ({ label, value: label }))}
                      placeholder="Add labels such as 'Shopping', 'Salary', 'Cinema'..."
                    />
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sender</label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Sender name (optional)"
                    {...register('sender')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Receiver</label>
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Receiver name (optional)"
                    {...register('receiver')}
                  />
                </div>
              </div>
            </>
          )}
          <div className="flex justify-between items-center mt-4">
            <button type="button" className="btn btn-secondary" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? '▼ Show More' : '▲ Show Less'}
            </button>
            <div className="flex space-x-2">
              <button type="button" className="btn btn-ghost bg-gray-200" onClick={() => reset()}>
                Reset
              </button>
              <button type="submit" className="btn btn-primary">
                Create
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default AddTransaction;
