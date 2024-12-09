import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClientLayout } from '@/components/layout/ClientLayout';
import "./globals.css";

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
      <body className={inter.className} suppressHydrationWarning>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
