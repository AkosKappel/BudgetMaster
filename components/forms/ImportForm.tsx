import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

import { InformationCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { zodResolver } from '@hookform/resolvers/zod';

import Tooltip from '@/components/ui/Tooltip';
import { type ImportData, importSchema } from '@/schemas/importSchema';

type ImportFormProps = {
  loading: boolean;
  onSubmit: (data: ImportData) => void;
};

const ImportForm: React.FC<ImportFormProps> = ({ loading, onSubmit }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (newFiles: File[]) => {
    setSelectedFiles((prevFiles) => [...prevFiles, ...newFiles]);
    setValue('files', [...selectedFiles, ...newFiles]);
    toast.info(`${newFiles.length} file(s) added`);
  };

  const handleFileRemove = (index: number) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
    setValue(
      'files',
      selectedFiles.filter((_, i) => i !== index),
    );
    toast.info('File removed');
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          onChange={(e) => e.target.files && handleFileSelect(Array.from(e.target.files))}
          multiple
        />
        {selectedFiles.length > 0 ? (
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{file.name}</span>
                <button
                  type="button"
                  onClick={() => handleFileRemove(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>
            ))}
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
              Drag and drop files here, or click here to select files
            </p>
          </label>
        )}
      </div>

      {errors.root && <p className="text-red-500 text-xs mt-1">{errors.root.message}</p>}

      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center">
          <label className="block text-sm font-medium text-left text-gray-500">
            Import your transactions from any type of document or just a chunk of text.
          </label>
          <Tooltip content="You can import your transactions data by pasting it above or by uploading any type of files with your transactions data.">
            <InformationCircleIcon className="h-5 w-5 ml-2 text-gray-400 cursor-help" />
          </Tooltip>
        </div>

        <div className="flex space-x-2">
          <button
            type="button"
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors duration-200 ease-in-out"
            onClick={() => {
              reset();
              setSelectedFiles([]);
              toast.info('Form reset');
            }}
            disabled={loading}
          >
            Clear
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded btn btn-primary transition-colors duration-200 ease-in-out"
            disabled={loading || (!rawText && selectedFiles.length === 0)}
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </form>
  );
};

export default ImportForm;
