import React from 'react';
import { Controller } from 'react-hook-form';
import CreatableSelect from 'react-select/creatable';

type MultiSelectProps = {
  options: string[];
  control: any;
  name: string;
  label: string;
  placeholder: string;
  error?: string;
  className?: string;
  isMulti?: boolean;
};

const MultiSelect: React.FC<MultiSelectProps> = ({
  options,
  control,
  name,
  label,
  placeholder,
  error,
  className,
  isMulti = true,
}) => (
  <div className={className}>
    {label && <label className="block text-sm font-medium mb-1 text-left">{label}</label>}
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <CreatableSelect
          isMulti={isMulti}
          className={`react-select-container ${error ? 'border-red-500' : ''}`}
          classNamePrefix="react-select"
          styles={{
            control: (provided, state) => ({
              ...provided,
              backgroundColor: 'white',
              borderColor: error ? 'rgb(239 68 68)' : state.isFocused ? 'rgb(20 184 166)' : 'rgb(209 213 219)',
              borderWidth: state.isFocused ? '2px' : '1px',
              boxShadow: 'none',
              '&:hover': {
                borderColor: error ? 'rgb(239 68 68)' : 'rgb(20 184 166)',
                borderWidth: '1px',
              },
              '&:focus-within': {
                borderColor: 'rgb(20 184 166)',
                borderWidth: '2px',
              },
            }),
            placeholder: (provided) => ({
              ...provided,
              color: 'rgb(156 163 175)',
            }),
            option: (provided, state) => ({
              ...provided,
              backgroundColor: state.isSelected
                ? 'rgb(51, 145, 134)'
                : state.isFocused
                  ? 'rgb(20 184 166)'
                  : provided.backgroundColor,
              color: state.isSelected ? 'white' : state.isFocused ? 'white' : provided.color,
            }),
            menuList: (provided) => ({
              ...provided,
              maxHeight: '200px',
              overflowY: 'auto',
            }),
          }}
          onChange={(val: any) =>
            field.onChange(isMulti ? (val ? val.map((v: any) => v.value) : []) : val ? val.value : null)
          }
          value={
            isMulti
              ? (field.value || []).map((label: string) => ({ label, value: label }))
              : field.value
                ? { label: field.value, value: field.value }
                : null
          }
          options={options.map((option: string) => ({ label: option, value: option }))}
          placeholder={placeholder}
          closeMenuOnSelect={true}
          isClearable={true}
        />
      )}
    />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

export default MultiSelect;
