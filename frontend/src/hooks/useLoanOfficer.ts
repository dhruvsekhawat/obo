import { useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '@/services/auth';
import debounce from 'lodash/debounce';
import type { DebouncedFunc } from 'lodash';

interface LoanOfficerProfile {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  preferences: {
    regions: string[];
    min_loan_amount: number;
    max_loan_amount: number;
    min_fico_score: number;
    max_fico_score: number;
    max_apr_threshold: number;
    conventional_enabled: boolean;
    fha_enabled: boolean;
    va_enabled: boolean;
    jumbo_enabled: boolean;
    open_to_all_regions: boolean;
  };
  is_active: boolean;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const FETCH_THROTTLE = 1000; // 1 second between fetches

export const useLoanOfficer = () => {
  const [profile, setProfile] = useState<LoanOfficerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  // Clear cache
  const clearCache = useCallback(() => {
    localStorage.removeItem('loanOfficerProfile');
    localStorage.removeItem('loanOfficerProfileTimestamp');
  }, []);

  // Throttled fetch function
  const throttledFetch = useCallback(
    debounce(async (useCached = true) => {
      if (!isMountedRef.current) return;

      const now = Date.now();
      if (now - lastFetchRef.current < FETCH_THROTTLE) {
        return;
      }
      lastFetchRef.current = now;

      try {
        // Check cache first if allowed
        if (useCached) {
          const cachedData = localStorage.getItem('loanOfficerProfile');
          const cachedTimestamp = localStorage.getItem('loanOfficerProfileTimestamp');
          
          if (cachedData && cachedTimestamp) {
            const timestamp = parseInt(cachedTimestamp);
            if (now - timestamp < CACHE_DURATION) {
              if (isMountedRef.current) {
                setProfile(JSON.parse(cachedData));
                setIsLoading(false);
                setError(null);
              }
              return;
            }
          }
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/loan_officer/profile/`,
          {
            headers: {
              'Authorization': `Bearer ${authService.getToken()}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch loan officer profile');
        }

        const data = await response.json();
        if (isMountedRef.current) {
          setProfile(data);
          setError(null);
          
          // Update cache
          localStorage.setItem('loanOfficerProfile', JSON.stringify(data));
          localStorage.setItem('loanOfficerProfileTimestamp', now.toString());
        }
      } catch (err) {
        console.error('Error fetching loan officer profile:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch profile');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }, FETCH_THROTTLE, { leading: true, trailing: false }),
    []
  );

  // Initialize profile
  useEffect(() => {
    isMountedRef.current = true;
    throttledFetch(true);

    return () => {
      isMountedRef.current = false;
    };
  }, [throttledFetch]);

  // Handle profile updates
  const updateProfile = useCallback(async (updates: Partial<LoanOfficerProfile>) => {
    if (!isMountedRef.current) return;

    try {
      // Clear cache before update
      clearCache();

      // Update preferences if they exist in the updates
      if (updates.preferences) {
        const preferencesResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/loan_officer/preferences/`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${authService.getToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates.preferences),
          }
        );

        if (!preferencesResponse.ok) {
          throw new Error('Failed to update preferences');
        }
      }

      // Update profile
      const profileResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/loan_officer/profile/`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );

      if (!profileResponse.ok) {
        throw new Error('Failed to update profile');
      }

      // Fetch fresh data after update
      await throttledFetch(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  }, [throttledFetch, clearCache]);

  // Refresh profile data
  const refreshProfile = useCallback(async () => {
    if (!isMountedRef.current) return;
    clearCache();
    await throttledFetch(false);
  }, [throttledFetch, clearCache]);

  return {
    profile,
    isLoading,
    error,
    refreshProfile,
    updateProfile
  };
}; 