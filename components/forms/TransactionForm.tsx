import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';

import {
  ArrowPathIcon,
  ArrowPathRoundedSquareIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/solid';
import { zodResolver } from '@hookform/resolvers/zod';

import { InputField, MultiSelect, SwitchButton } from '@/components/inputs';
import { useRemoveTransaction, useTransactionSubmit } from '@/hooks/useTransactions';
import { type TransactionData, transactionSchema } from '@/schemas/transactionSchema';
import { RootState } from '@/store';

type TransactionFormProps = {
  transaction: TransactionData | null;
  onSubmit?: (data: TransactionData, transaction: TransactionData | null) => void;
  onDelete?: (transaction: TransactionData) => void;
  onSuccess?: (transaction: TransactionData) => void;
  onError?: (error: string) => void;
  title?: string;
  startCollapsed?: boolean;
};

const TransactionForm: React.FC<TransactionFormProps> = ({
  transaction,
  onSubmit,
  onDelete,
  onSuccess,
  onError,
  title,
  startCollapsed = true,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(startCollapsed);
  const { uniqueLabels } = useSelector((state: RootState) => state.transactions);
  const { submitTransaction, loading } = useTransactionSubmit();
  const { removeTransaction, loading: deleting } = useRemoveTransaction();

  const defaultValues = {
    date: new Date().toISOString().split('T')[0],
    isExpense: true,
    labels: [],
  };

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
    defaultValues,
  });

  useEffect(() => {
    if (transaction) {
      Object.entries(transaction).forEach(([key, value]) => {
        setValue(key as keyof TransactionData, value);
      });
    }
  }, [transaction, setValue]);

  const isExpense = watch('isExpense', true);

  const handleOnSubmit = async (data: TransactionData) => {
    if (onSubmit) {
      onSubmit(data, transaction);
    } else {
      const success = await submitTransaction(data, transaction);
      if (success) {
        reset();
        onSuccess?.(data);
      } else {
        onError?.('Failed to submit transaction');
      }
    }
  };

  const handleOnDelete = async (transaction: TransactionData) => {
    if (onDelete) {
      onDelete(transaction);
    } else {
      if (transaction?._id) {
        const success = await removeTransaction(transaction._id);
        if (success) {
          reset();
          onSuccess?.(transaction);
        } else {
          onError?.('Failed to delete transaction');
        }
      }
    }
  };

  const handleReset = () => {
    if (transaction) {
      Object.entries(transaction).forEach(([key, value]) => {
        setValue(key as keyof TransactionData, value);
      });
    } else {
      reset();
    }
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">
        {title || (transaction ? 'Edit Transaction' : 'Add Transaction')}
      </h2>
      <form onSubmit={handleSubmit(handleOnSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InputField
            label="Title"
            type="text"
            placeholder="Transaction name"
            register={register('title')}
            error={errors.title?.message}
            className="sm:col-span-2"
          />
          <InputField
            label="Category"
            type="text"
            placeholder="E.g. Groceries"
            register={register('category')}
            error={errors.category?.message}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <InputField
            label="Amount (€)"
            type="number"
            placeholder="0.00 €"
            register={register('amount', { valueAsNumber: true })}
            error={errors.amount?.message}
            min={0}
            step="0.01"
          />
          <InputField
            label="Date"
            type="date"
            placeholder=""
            register={register('date')}
            error={errors.date?.message}
          />
          <SwitchButton
            checked={!isExpense}
            onChange={(checked) => setValue('isExpense', !checked)}
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
            error={errors.labels?.message}
            className="mt-4"
            options={uniqueLabels}
            placeholder="Add labels such as 'Shopping', 'Salary', 'Cinema'..."
          />
          <div className="grid grid-cols-2 gap-4 mt-4">
            <InputField
              label="Sender"
              type="text"
              placeholder="Sender name (optional)"
              register={register('sender')}
            />
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
            {transaction && (
              <button
                type="button"
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200 ease-in-out flex items-center justify-center"
                onClick={() => handleOnDelete(transaction)}
                disabled={loading || deleting}
              >
                {deleting ? (
                  <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
                ) : (
                  <TrashIcon className="h-5 w-5 mr-2" />
                )}
                {deleting ? 'Deleting...' : 'Delete'}
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
              disabled={loading || deleting}
            >
              {loading ? (
                <ArrowPathIcon className="animate-spin h-5 w-5 mr-2" />
              ) : transaction ? (
                <PencilIcon className="h-5 w-5 mr-2" />
              ) : (
                <PlusIcon className="h-5 w-5 mr-2" />
              )}
              {transaction && !onSubmit
                ? loading
                  ? 'Updating...'
                  : 'Update'
                : loading
                  ? 'Creating...'
                  : 'Create'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default TransactionForm;
