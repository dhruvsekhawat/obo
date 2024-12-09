'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { authService } from '@/services/auth';
import { Button } from '@/components/shared/Button';
import {
  BanknotesIcon,
  HomeIcon,
  UserIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Loan {
  id: number;
  borrower: {
    first_name: string;
    last_name: string;
    credit_score: number;
    annual_income: number;
  };
  loan_amount: number;
  original_apr: number;
  location: string;
  status: string;
  fico_score: number;
  loan_type: string;
  loan_term: number;
  property_value: number;
  down_payment: number;
  monthly_payment: number;
  debt_to_income_ratio: number;
  days_remaining: number;
  created_at: string;
  is_guaranteed: boolean;
  lead_type: string;
}

interface GuaranteedLoansResponse {
  loans: Loan[];
  credits_available: number;
  credits_used: number;
  reset_date: string;
}

export default function GuaranteedLoansPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [credits, setCredits] = useState({
    available: 0,
    used: 0,
    resetDate: '',
  });
  const [claimingLoanId, setClaimingLoanId] = useState<number | null>(null);

  useEffect(() => {
    const userData = authService.getUser();
    console.log('User Data:', userData); // Debug log

    if (!userData) {
      router.push('/login');
      return;
    }

    // Check if user is a loan officer
    if (!userData.role || userData.role !== 'LOAN_OFFICER') {
      toast.error('Only loan officers can access this page');
      router.push('/dashboard');
      return;
    }

    // Check if loan officer profile is active
    if (!userData.loan_officer_profile?.is_active) {
      toast.error('Your loan officer profile is not active');
      router.push('/dashboard');
      return;
    }

    setUser(userData);
    fetchGuaranteedLoans();
  }, [router]);

  const fetchGuaranteedLoans = async () => {
    try {
      const token = authService.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/loans/guaranteed_loans/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch loans');
      }

      const data: GuaranteedLoansResponse = await response.json();
      console.log('Guaranteed Loans Response:', data); // Debug log
      
      // Filter out non-guaranteed loans just in case
      const guaranteedLoans = data.loans.filter(loan => 
        loan.is_guaranteed || loan.lead_type === 'GUARANTEED'
      );
      
      setLoans(guaranteedLoans);
      setCredits({
        available: data.credits_available,
        used: data.credits_used,
        resetDate: data.reset_date,
      });
    } catch (error: any) {
      console.error('Error fetching guaranteed loans:', error);
      if (error.message.includes('loan officer')) {
        router.push('/dashboard');
      }
      toast.error(error.message || 'Failed to load guaranteed loans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimLoan = async (loanId: number) => {
    try {
      setClaimingLoanId(loanId);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/loans/${loanId}/claim_guaranteed/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to claim loan');
      }

      toast.success('Loan claimed successfully!');
      fetchGuaranteedLoans(); // Refresh the loans list
    } catch (error: any) {
      console.error('Error claiming loan:', error);
      toast.error(error.message || 'Failed to claim loan');
    } finally {
      setClaimingLoanId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 sm:px-0 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Guaranteed Loans</h2>
              <p className="mt-1 text-sm text-gray-500">
                Browse and claim loans that match your preferences
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                Credits Available: {credits.available}
              </p>
              <p className="text-xs text-gray-500">
                Used: {credits.used} • Resets: {formatDate(credits.resetDate)}
              </p>
            </div>
          </div>
        </div>

        {/* Loans Grid */}
        <div className="px-4 sm:px-0">
          {loans.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <XMarkIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No loans available</h3>
              <p className="mt-1 text-sm text-gray-500">
                Check back later for new guaranteed loan opportunities
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {loans.map((loan) => (
                <div
                  key={loan.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {loan.loan_type} Loan
                        </h3>
                        <p className="text-sm text-gray-500">{loan.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(loan.loan_amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {loan.original_apr}% APR
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center">
                        <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {loan.fico_score}
                          </p>
                          <p className="text-xs text-gray-500">FICO Score</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <HomeIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(loan.property_value)}
                          </p>
                          <p className="text-xs text-gray-500">Property Value</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <BanknotesIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(loan.monthly_payment)}
                          </p>
                          <p className="text-xs text-gray-500">Monthly Payment</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {loan.debt_to_income_ratio}%
                          </p>
                          <p className="text-xs text-gray-500">DTI Ratio</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-500">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {loan.days_remaining} days remaining
                      </div>
                      <Button
                        onClick={() => handleClaimLoan(loan.id)}
                        isLoading={claimingLoanId === loan.id}
                        disabled={credits.available === 0 || claimingLoanId !== null}
                      >
                        {credits.available > 0 ? 'Claim Loan' : 'No Credits Available'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 