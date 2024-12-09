'use client';

import { Toaster } from "react-hot-toast";
import { ProfileGuard } from '@/components/auth/ProfileGuard';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ProfileGuard>
        {children}
      </ProfileGuard>
      <Toaster position="top-right" />
    </>
  );
} 