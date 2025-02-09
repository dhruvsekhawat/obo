'use client';

import { FC, useEffect, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/shared/Button';
import { authService } from '@/services/auth';

interface GoogleResponse {
  credential: string;
}

interface AuthResponse {
  success: boolean;
  access: string;
  user: any;
  message?: string;
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
          cancel: () => void;
        };
      };
    };
  }
}

export const GoogleAuth: FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleGoogleResponse = useCallback(async (response: GoogleResponse) => {
    try {
      setIsLoading(true);
      const result = await authService.googleAuth(response.credential);

      if (result.success) {
        authService.setToken(result.access);
        authService.setUser(result.user);
        toast.success('Successfully signed in with Google!');

        if (result.user.role !== 'LOAN_OFFICER') {
          toast.error('Only loan officers can access this platform');
          authService.logout();
          router.push('/login');
          return;
        }

        if (!result.user.loan_officer_profile?.profile_completed) {
          toast.success('Please complete your profile to continue');
          router.push('/dashboard/profile?tab=profile&new=true');
          return;
        }

        router.push('/dashboard');
      } else {
        toast.error(result.message || 'Google sign-in failed');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error('An error occurred during Google sign-in');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!clientId || !googleButtonRef.current || isInitialized) return;

    const initializeGoogleSignIn = () => {
      if (!window.google?.accounts?.id) {
        console.error('Google Sign-In SDK not loaded');
        return;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
        });

        window.google.accounts.id.renderButton(googleButtonRef.current!, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width: googleButtonRef.current!.offsetWidth,
          logo_alignment: 'center',
        });

        setIsInitialized(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing Google Sign-In:', error);
        setIsLoading(false);
      }
    };

    if (window.google?.accounts?.id) {
      initializeGoogleSignIn();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleSignIn;
      script.onerror = () => {
        console.error('Failed to load Google Sign-In SDK');
        setIsLoading(false);
      };
      document.body.appendChild(script);
    }

    return () => {
      try {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.cancel();
        }
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
  }, [clientId, handleGoogleResponse, isInitialized]);

  if (!clientId) {
    console.warn('Google Client ID not defined');
    return null;
  }

  return (
    <div className="w-full">
      {isLoading ? (
        <Button
          type="button"
          variant="outline"
          className="w-full h-[40px] flex items-center justify-center"
          disabled
        >
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600"
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
          Loading Google Sign-In...
        </Button>
      ) : (
        <div 
          ref={googleButtonRef}
          className="w-full min-h-[40px] flex justify-center items-center"
          aria-label="Google Sign-In Button"
        />
      )}
    </div>
  );
};

GoogleAuth.displayName = 'GoogleAuth';
