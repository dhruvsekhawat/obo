import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  containerClassName?: string;
}

export function Input({
  id,
  label,
  error,
  className,
  containerClassName,
  ...props
}: InputProps) {
  return (
    <div className={containerClassName}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        className={clsx(
          'mt-1 block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400',
          'focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors',
          error ? 'border-red-300 ring-red-500' : 'border-gray-300',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
} 