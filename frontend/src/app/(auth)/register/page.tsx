'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { Input } from '@/components/shared/Input';
import { Button } from '@/components/shared/Button';
import { authService } from '@/services/auth';
import type { RegisterCredentials } from '@/types/auth';
import { GoogleAuth } from '@/components/auth/GoogleAuth';

type FormData = Omit<RegisterCredentials, 'role'> & { confirmPassword: string };

interface ValidationErrors {
  email?: string;
  'loan_officer_profile.nmls_id'?: string;
  [key: string]: string | undefined;
}

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [backendErrors, setBackendErrors] = useState<ValidationErrors>({});
  const { register, handleSubmit, watch, formState: { errors }, setError } = useForm<FormData>();
  const password = watch('password');

  const handleBackendError = (error: any) => {
    const data = error.response?.data;
    if (data) {
      // Handle specific validation errors
      if (typeof data === 'object') {
        const validationErrors: ValidationErrors = {};
        
        // Process each error field
        Object.entries(data).forEach(([key, value]) => {
          const errorMessage = Array.isArray(value) ? value[0] : value;
          validationErrors[key] = errorMessage as string;
          
          // Set error in react-hook-form
          setError(key as any, {
            type: 'backend',
            message: errorMessage as string
          });
        });
        
        setBackendErrors(validationErrors);
        
        // Show the first error message in toast
        const firstError = Object.values(validationErrors)[0];
        if (firstError) {
          toast.error(firstError);
        }
      } else {
        // Handle general error message
        toast.error(data.message || 'Registration failed');
      }
    } else {
      toast.error('An error occurred during registration');
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setBackendErrors({});
      if (data.password !== data.confirmPassword) {
        setError('confirmPassword', {
          type: 'manual',
          message: 'Passwords do not match'
        });
        return;
      }

      setIsLoading(true);
      const response = await authService.register({
        ...data,
        role: 'LOAN_OFFICER'
      });
      
      if (response.success) {
        authService.setToken(response.access);
        authService.setUser(JSON.stringify(response.user));
        toast.success('Registration successful!');
        
        // Check if profile needs to be completed
        if (response.user.role === 'LOAN_OFFICER') {
          const { profile_completed } = response.user.loan_officer_profile || {};
          if (!profile_completed) {
            toast.success('Please complete your profile to continue');
            router.push('/dashboard/profile?tab=profile&new=true');
            return;
          }
        }
        
        router.push('/dashboard');
      } else {
        handleBackendError({ response: { data: response } });
      }
    } catch (error: any) {
      handleBackendError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>
          <p className="mt-2 text-sm text-gray-600">Join as a Loan Officer</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="John"
              error={errors.first_name?.message || backendErrors.first_name}
              {...register('first_name', { required: 'Required' })}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              error={errors.last_name?.message || backendErrors.last_name}
              {...register('last_name', { required: 'Required' })}
            />
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="name@example.com"
            error={errors.email?.message || backendErrors.email}
            {...register('email', {
              required: 'Required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email'
              }
            })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="NMLS ID"
              placeholder="12345678"
              error={errors.loan_officer_profile?.nmls_id?.message || backendErrors['loan_officer_profile.nmls_id']}
              {...register('loan_officer_profile.nmls_id', {
                required: 'Required',
                pattern: {
                  value: /^\d{6,8}$/,
                  message: 'Must be 6-8 digits'
                }
              })}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="(555) 123-4567"
              error={errors.phone_number?.message || backendErrors.phone_number}
              {...register('phone_number', {
                required: 'Required',
                pattern: {
                  value: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
                  message: 'Invalid format'
                }
              })}
            />
          </div>

          <Input
            label="Company"
            placeholder="Your Brokerage Company"
            error={errors.loan_officer_profile?.company_name?.message || backendErrors['loan_officer_profile.company_name']}
            {...register('loan_officer_profile.company_name', { required: 'Required' })}
          />

          <Input
            label="Years of Experience"
            type="number"
            placeholder="5"
            error={errors.loan_officer_profile?.years_of_experience?.message || backendErrors['loan_officer_profile.years_of_experience']}
            {...register('loan_officer_profile.years_of_experience', {
              required: 'Required',
              min: { value: 0, message: 'Must be 0 or greater' },
              valueAsNumber: true
            })}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Create password"
            error={errors.password?.message || backendErrors.password}
            {...register('password', {
              required: 'Required',
              minLength: { value: 8, message: 'Min 8 characters' },
              pattern: {
                value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                message: 'Must include uppercase, lowercase, number and special character'
              }
            })}
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Confirm password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Required',
              validate: value => value === password || 'Passwords do not match'
            })}
          />

          <label className="flex items-start mt-4">
            <input
              type="checkbox"
              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              required
            />
            <span className="ml-2 text-sm text-gray-600">
              I agree to the{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-500">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-500">Privacy Policy</Link>
            </span>
          </label>

          <Button
            type="submit"
            className="w-full mt-6"
            isLoading={isLoading}
          >
            Create Account
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <GoogleAuth />

          <p className="mt-4 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
} 