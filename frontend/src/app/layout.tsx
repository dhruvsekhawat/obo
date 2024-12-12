import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClientLayout } from '@/components/layout/ClientLayout';
import "./globals.css";
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Beat My Rate - Loan Officer Platform",
  description: "A modern platform for loan officers to compete for and manage loan opportunities.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link 
          rel="preload"
          href="https://accounts.google.com/gsi/client"
          as="script"
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Toaster position="top-right" />
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
