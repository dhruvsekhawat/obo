import { useState } from 'react';

export type ValidationErrors = Record<string, string>;

export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validate: (values: T) => ValidationErrors
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setValues(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setValues(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const setFieldValue = (name: string, value: any) => {
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setValues(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value,
        },
      }));
    } else {
      setValues(prev => ({ ...prev, [name]: value }));
    }

    // Clear error when field is updated
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleValidation = () => {
    const validationErrors = validate(values);
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  return {
    values,
    errors,
    isLoading,
    setIsLoading,
    handleChange,
    handleValidation,
    setErrors,
    setFieldValue,
  };
} 