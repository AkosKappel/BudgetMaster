import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';

import { ArrowPathIcon, ArrowPathRoundedSquareIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/solid';
import { zodResolver } from '@hookform/resolvers/zod';

import { InputField, MultiSelect, SwitchButton } from '@/components/inputs';
import { useCreateTransaction, useDeleteTransaction, useUpdateTransaction } from '@/hooks/transactions';
import { type Transaction, transactionSchema } from '@/schemas/transactionSchema';
import { RootState } from '@/store';

export default function TransactionForm({
  transaction,
  startCollapsed = false,
  onSuccess,
  onError,
}: {
  transaction: Transaction | null;
  startCollapsed?: boolean;
  onSuccess?: () => void;
  onError?: () => void;
}) {
  const isEdit = !!transaction; // create or edit
  const [isCollapsed, setIsCollapsed] = useState<boolean>(startCollapsed);
  const uniqueLabels = useSelector((state: RootState) => state.transactions.existingLabels);

  const { create, isLoading: isCreating } = useCreateTransaction(onSuccess, onError);
  const { update, isLoading: isUpdating } = useUpdateTransaction(onSuccess, onError);
  const { remove, isLoading: isDeleting } = useDeleteTransaction(onSuccess, onError);
  const isPending = isCreating || isUpdating || isDeleting;

  const defaultValues = {
    date: new Date().toISOString().split('T')[0],
    isExpense: true,
    labels: [],
  };
  const {
    register,
    reset,
    control,
    setValue,
    watch,
    handleSubmit: submitForm,
    formState: { errors },
  } = useForm<Transaction>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });
  const isExpense = watch('isExpense', true);

  useEffect(() => {
    if (transaction) {
      Object.entries(transaction).forEach(([key, value]) => {
        setValue(key as keyof Transaction, value);
      });
    }
  }, [transaction, setValue]);

  const handleSubmit = async (data: Transaction) => {
    isEdit ? update(data) : create(data);
  };

  const handleDelete = async (data: Transaction) => {
    remove(data);
  };

  const handleReset = () => {
    if (isEdit) {
      // reset to initial values
      Object.entries(transaction).forEach(([key, value]) => {
        setValue(key as keyof Transaction, value);
      });
    } else {
      reset(); // reset to empty form
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">{transaction ? 'Edit' : 'Add'} Transaction</h2>
      <form onSubmit={submitForm(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InputField
            label="Title"
            type="text"
            placeholder="Transaction name"
            register={register('title')}
            error={errors?.title?.message}
            className="sm:col-span-2"
          />
          <InputField
            label="Category"
            type="text"
            placeholder="E.g. Groceries"
            register={register('category')}
            error={errors?.category?.message}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <InputField
            label="Amount (€)"
            type="number"
            placeholder="0.00 €"
            register={register('amount', { valueAsNumber: true })}
            error={errors?.amount?.message}
            min={0}
            step="0.01"
          />
          <InputField
            label="Date"
            type="date"
            placeholder=""
            register={register('date')}
            error={errors?.date?.message}
          />
          <SwitchButton
            checked={!isExpense}
            onChange={(checked) => setValue('isExpense', !checked)}
            register={register('isExpense')}
            leftLabel="Expense"
            rightLabel="Income"
            className="mt-4"
          />
        </div>
        <div className={`transition-all ${isCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-full'}`}>
          <InputField
            label="Description"
            type="text"
            placeholder="Details (optional)"
            register={register('description')}
          />
          <MultiSelect
            control={control}
            name="labels"
            label="Labels"
            error={errors?.labels?.message}
            className="mt-4"
            options={uniqueLabels}
            placeholder="Add labels such as 'Shopping', 'Salary', 'Cinema'..."
          />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <InputField label="Sender" type="text" placeholder="Sender name (optional)" register={register('sender')} />
            <InputField
              label="Receiver"
              type="text"
              placeholder="Receiver name (optional)"
              register={register('receiver')}
            />
          </div>
        </div>
        <div className="flex justify-between items-center mt-4">
          <button
            type="button"
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors duration-200 ease-in-out"
            onClick={() => setIsCollapsed((prev) => !prev)}
          >
            {isCollapsed ? '▼ Show More' : '▲ Show Less'}
          </button>
          <div className="flex space-x-2">
            {isEdit && (
              <button
                type="button"
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200 ease-in-out flex items-center justify-center"
                onClick={() => handleDelete(transaction)}
                disabled={isPending}
              >
                {isDeleting ? (
                  <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
                ) : (
                  <TrashIcon className="h-5 w-5 mr-2" />
                )}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
            <button
              type="button"
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors duration-200 ease-in-out flex items-center justify-center"
              onClick={handleReset}
            >
              <ArrowPathRoundedSquareIcon className="h-5 w-5 mr-2" />
              Reset
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded btn btn-primary transition-colors duration-200 ease-in-out flex items-center justify-center"
              disabled={isPending}
            >
              {isCreating || isUpdating ? (
                <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
              ) : isEdit ? (
                <PencilIcon className="h-5 w-5 mr-2" />
              ) : (
                <PlusIcon className="h-5 w-5 mr-2" />
              )}
              {isCreating || isUpdating ? 'Saving...' : isEdit ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
