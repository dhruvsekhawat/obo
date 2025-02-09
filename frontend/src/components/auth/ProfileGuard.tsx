'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authService } from '@/services/auth';
import { toast } from 'react-hot-toast';

const ALLOWED_PATHS = ['/', '/dashboard/profile', '/login', '/register', '/borrower'];

export function ProfileGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = (user: any) => !!user;
  const isLoanOfficer = (user: any) => user?.role === 'LOAN_OFFICER';
  const isProfileComplete = (user: any) => {
    const isGoogleUser = !!user?.google_id;
    const { profile_completed, nmls_id = '' } = user?.loan_officer_profile || {};
    return !isGoogleUser || (profile_completed && nmls_id);
  };

  useEffect(() => {
    const checkProfile = () => {
      try {
        const user = authService.getUser();

        if (ALLOWED_PATHS.includes(pathname)) return;

        if (!isAuthenticated(user)) {
          router.push('/login');
          return;
        }

        if (!isLoanOfficer(user)) {
          toast.error('Only loan officers can access this platform');
          authService.logout();
          router.push('/login');
          return;
        }

        if (!isProfileComplete(user)) {
          toast.error('Please complete your profile to access this page');
          router.push('/dashboard/profile?tab=profile&new=true');
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        toast.error('An unexpected error occurred. Please try again.');
      }
    };

    checkProfile();
  }, [router, pathname]);

  return <>{children}</>;
}
