'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { authService } from '@/services/auth';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import {
  BanknotesIcon,
  HomeIcon,
  UserIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

interface Borrower {
  first_name: string;
  last_name: string;
  credit_score: number;
  annual_income: number;
}

interface Loan {
  id: number;
  borrower: Borrower;
  loan_amount: number;
  original_apr: number;
  lowest_bid_apr: number | null;
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
  current_bid_count: number;
  max_bids: number;
  current_leader: any;
  created_at: string;
}

interface BidAmounts {
  [key: number]: number | '';
}

export default function CompetitiveLoansPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [bidAmounts, setBidAmounts] = useState<BidAmounts>({});
  const [submittingBidForLoan, setSubmittingBidForLoan] = useState<number | null>(null);

  useEffect(() => {
    const userData = authService.getUser();
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(userData);
    fetchCompetitiveLoans();
  }, [router]);

  const fetchCompetitiveLoans = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/loans/competitive_loans/`, {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch loans');
      }

      const data = await response.json();
      console.log('Competitive Loans Response:', data);
      
      // Initialize empty bid amounts
      const initialBidAmounts: { [key: number]: number | '' } = {};
      data.forEach((loan: Loan) => {
        initialBidAmounts[loan.id] = '';
      });
      setBidAmounts(initialBidAmounts);
      
      setLoans(data);
    } catch (error: any) {
      console.error('Error fetching competitive loans:', error);
      toast.error(error.message || 'Failed to load competitive loans');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBidSubmit = async (loanId: number) => {
    try {
      setSubmittingBidForLoan(loanId);
      const bidApr = bidAmounts[loanId];
      
      if (!bidApr) {
        toast.error('Please enter a valid APR');
        return;
      }

      const loan = loans.find(l => l.id === loanId);
      if (!loan) return;

      // Validate bid
      if (loan.lowest_bid_apr && bidApr >= loan.lowest_bid_apr) {
        toast.error('Bid must be lower than current lowest APR');
        return;
      }

      if (bidApr >= loan.original_apr) {
        toast.error('Bid must be lower than original APR');
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/loans/${loanId}/place_bid/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bid_apr: bidApr }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place bid');
      }

      // Clear the bid amount for this loan
      setBidAmounts(prev => ({
        ...prev,
        [loanId]: ''
      }));

      toast.success('Bid placed successfully!');
      fetchCompetitiveLoans(); // Refresh the loans list
    } catch (error: any) {
      console.error('Error placing bid:', error);
      toast.error(error.message || 'Failed to place bid');
    } finally {
      setSubmittingBidForLoan(null);
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
              <h2 className="text-2xl font-bold text-gray-900">Competitive Loans</h2>
              <p className="mt-1 text-sm text-gray-500">
                Place competitive bids on available loan opportunities
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Loans Grid */}
        <div className="px-4 sm:px-0">
          {loans.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <XMarkIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No loans available</h3>
              <p className="mt-1 text-sm text-gray-500">
                Check back later for new loan opportunities
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
                        <div className="flex flex-col items-end">
                          <p className="text-sm text-gray-500">
                            Original: {loan.original_apr}% APR
                          </p>
                          {loan.lowest_bid_apr && (
                            <p className="text-sm text-green-600">
                              Best Bid: {loan.lowest_bid_apr}% APR
                            </p>
                          )}
                        </div>
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

                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {loan.days_remaining} days remaining
                        </div>
                        <div className="text-sm text-gray-500">
                          {loan.current_bid_count} / {loan.max_bids} bids placed
                        </div>
                      </div>

                      <div className="flex items-end space-x-4">
                        <div className="flex-grow">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Your Bid (APR)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={loan.lowest_bid_apr || loan.original_apr}
                            value={bidAmounts[loan.id]}
                            onChange={(e) => {
                              const value = e.target.value ? parseFloat(e.target.value) : '';
                              setBidAmounts(prev => ({
                                ...prev,
                                [loan.id]: value
                              }));
                            }}
                            className="block w-full"
                            disabled={submittingBidForLoan !== null}
                            placeholder="Enter APR"
                            autoComplete="off"
                          />
                        </div>
                        <Button
                          onClick={() => handleBidSubmit(loan.id)}
                          isLoading={submittingBidForLoan === loan.id}
                          disabled={
                            submittingBidForLoan !== null ||
                            !bidAmounts[loan.id] ||
                            (loan.lowest_bid_apr && bidAmounts[loan.id] >= loan.lowest_bid_apr) ||
                            loan.current_bid_count >= loan.max_bids
                          }
                        >
                          Place Bid
                        </Button>
                      </div>

                      {loan.current_leader?.id === user.loan_officer_profile?.id && (
                        <div className="mt-2 flex items-center text-sm text-green-600">
                          <CheckBadgeIcon className="h-4 w-4 mr-1" />
                          You are currently leading this bid
                        </div>
                      )}
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