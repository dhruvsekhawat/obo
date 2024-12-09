'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/shared/Button';
import { authService } from '@/services/auth';

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

export function GoogleAuth() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleGoogleResponse = useCallback(async (response: any) => {
    try {
      setIsLoading(true);
      const result = await authService.googleAuth(response.credential);

      if (result.success) {
        authService.setToken(result.access);
        authService.setUser(JSON.stringify(result.user));
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
    if (!clientId || !googleButtonRef.current) return;

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      if (isScriptLoaded) return;
      existingScript.remove();
      setIsScriptLoaded(false);
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsScriptLoaded(true);
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
      });

      window.google.accounts.id.renderButton(googleButtonRef.current!, {
        theme: 'outline',
        size: 'large',
        width: googleButtonRef.current!.offsetWidth,
        text: 'continue_with',
      });
    };

    document.body.appendChild(script);

    return () => {
      try {
        if (window.google?.accounts?.id) {
          window.google.accounts.id.cancel();
        }
        const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
        if (script) script.remove();
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    };
  }, [clientId, handleGoogleResponse, isScriptLoaded]);

  if (!clientId) {
    console.warn('Google Client ID not defined. Check environment variables.');
    return <p>Error: Google authentication is not configured properly.</p>;
  }

  return (
    <div className="w-full">
      {isLoading ? (
        <Button type="button" variant="outline" className="w-full" isLoading>
          Loading...
        </Button>
      ) : (
        <div 
          ref={googleButtonRef} 
          className="w-full flex justify-center items-center min-h-[40px]" 
          aria-label="Google Sign-In Button"
        />
      )}
    </div>
  );
}
