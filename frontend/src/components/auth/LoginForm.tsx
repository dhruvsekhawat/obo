'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';
import { Input } from '@/components/forms/Input';
import { LoginCredentials } from '@/types/auth';
import { authService } from '@/services/auth';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

const initialValues: LoginCredentials = {
  email: '',
  password: '',
};

export function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const data = await authService.login(formData);
      const cookieOptions = {
        expires: rememberMe ? 30 : 1,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const
      };
      
      Cookies.set('token', data.access, cookieOptions);
      Cookies.set('user', JSON.stringify(data.user), cookieOptions);
      
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (!navigator.onLine) {
        toast.error('Please check your internet connection');
        return;
      }

      const responseData = error.response?.data;
      const status = error.response?.status;

      switch (status) {
        case 401:
          setErrors({
            email: 'Invalid email or password',
            password: 'Invalid email or password',
          });
          toast.error('Invalid email or password');
          break;

        case 400:
          if (responseData) {
            const newErrors: Record<string, string> = {};
            
            if (responseData.email) {
              newErrors.email = Array.isArray(responseData.email) 
                ? responseData.email[0] 
                : responseData.email;
            }
            
            if (responseData.password) {
              newErrors.password = Array.isArray(responseData.password) 
                ? responseData.password[0] 
                : responseData.password;
            }
            
            if (responseData.non_field_errors) {
              const message = Array.isArray(responseData.non_field_errors)
                ? responseData.non_field_errors[0]
                : responseData.non_field_errors;
              toast.error(message);
            }

            if (responseData.detail) {
              toast.error(responseData.detail);
            }

            setErrors(newErrors);
          }
          break;

        case 403:
          toast.error('Your account is not active. Please contact support.');
          break;

        case 404:
          setErrors({
            email: 'Account not found with this email',
          });
          toast.error('Account not found. Please check your email or sign up.');
          break;

        case 429:
          toast.error('Too many login attempts. Please try again in a few minutes.');
          break;

        default:
          toast.error('An error occurred. Please try again later.');
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-4">
        <Input
          id="email"
          name="email"
          type="email"
          label="Email address"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          disabled={isLoading}
        />

        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            label="Password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-[34px] p-1 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
              <EyeSlashIcon className="h-5 w-5" />
            ) : (
              <EyeIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            id="remember-me"
            name="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
            Remember me
          </label>
        </div>

        <div className="text-sm">
          <Link href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
            Forgot your password?
          </Link>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <div className="flex items-center">
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Signing in...
            </div>
          ) : (
            'Sign in'
          )}
        </button>
      </div>
    </form>
  );
} 