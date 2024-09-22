import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import { InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { zodResolver } from '@hookform/resolvers/zod';

import Tooltip from '@/components/ui/Tooltip';
import { type ImportData, importSchema } from '@/schemas/import';

type ImportFormProps = {
  onSubmitCallback: () => void;
};

const ImportForm: React.FC<ImportFormProps> = ({ onSubmitCallback }) => {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ImportData>({
    resolver: zodResolver(importSchema),
  });

  const rawText = watch('rawText');
  const file = watch('file');

  const onSubmit = async (data: ImportData) => {
    try {
      setLoading(true);
      console.log(data);
      // const response = await axios.post('/api/import', data);
      // if (response.status !== 200) {
      //   throw new Error('Failed to import data');
      // }
      reset();
      setSelectedFile(null);
      onSubmitCallback();
      toast.success('Data imported successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to import data');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setValue('file', file);
  };

  const handleFileRemove = () => {
    setSelectedFile(null);
    setValue('file', undefined);
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-4">Import Transactions</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center mb-2">
          <label className="block text-sm font-medium text-left text-gray-500">
            Import your transactions from any type of document or just a chunk of text.
          </label>
          <Tooltip content="You can import your transactions data by pasting it below or by uploading a file.">
            <InformationCircleIcon className="h-5 w-5 ml-2 text-gray-400 cursor-help" />
          </Tooltip>
        </div>
        <div>
          <textarea
            className={`w-full px-4 py-2 bg-white text-gray-800 rounded border ${
              errors.rawText ? 'border-red-500' : 'border-gray-300'
            } focus:outline-none focus:border-teal-500 focus:border-2 hover:border-teal-500 transition-colors duration-200 ease-in-out`}
            rows={5}
            placeholder="Paste your transactions data here"
            {...register('rawText')}
          />
          {errors.rawText && <p className="text-red-500 text-xs mt-1">{errors.rawText.message}</p>}
        </div>

        <div className="text-center my-4 flex items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <div className="mx-4 text-gray-500">OR</div>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-4 ${
            dragActive ? 'border-teal-500 bg-teal-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
          />
          {selectedFile ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{selectedFile.name}</span>
              <button
                type="button"
                onClick={handleFileRemove}
                className="text-red-500 hover:text-red-700"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                ></path>
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                Drag and drop a file here, or click to select a file
              </p>
            </label>
          )}
        </div>

        {errors.root && <p className="text-red-500 text-xs mt-1">{errors.root.message}</p>}

        <div className="flex justify-end space-x-2 mt-4">
          <button
            type="button"
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors duration-200 ease-in-out"
            onClick={() => {
              reset();
              setSelectedFile(null);
            }}
          >
            Reset
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded btn btn-primary transition-colors duration-200 ease-in-out"
            disabled={loading || (!rawText && !file)}
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </form>
    </>
  );
};

export default ImportForm;
