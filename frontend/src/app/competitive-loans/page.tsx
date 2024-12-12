'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { authService } from '@/services/auth';
import { loansService } from '@/services/loans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BanknotesIcon,
  HomeIcon,
  UserIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowPathIcon,
  XMarkIcon,
  CheckBadgeIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import Select from 'react-select';
import { CompetitiveLoan } from '@/types/loans';
import { useLoanOfficer } from '@/hooks/useLoanOfficer';
import { useNotifications } from '@/hooks/useNotifications';
import { useBidUpdates } from '@/hooks/useBidUpdates';

// Define proper types for the theme
type ThemeConfig = Theme & {
  colors: {
    primary: string;
    primary25: string;
    primary50: string;
    primary75: string;
  };
};

// Define select option type
interface SelectOption {
  value: string;
  label: string;
}

// Define consistent select styles
const selectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: 'white',
    borderColor: '#e5e7eb',
    '&:hover': {
      borderColor: '#93c5fd',
    },
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#eff6ff' : 'white',
    color: state.isSelected ? 'white' : '#111827',
    '&:active': {
      backgroundColor: '#dbeafe',
    },
  }),
};

// Define select theme
const selectTheme = (theme: ThemeConfig) => ({
  ...theme,
  colors: {
    ...theme.colors,
    primary: '#2563eb',
    primary25: '#eff6ff',
    primary50: '#dbeafe',
    primary75: '#bfdbfe',
  },
});

const SORT_OPTIONS: SelectOption[] = [
  { value: 'created_at', label: 'Date Added' },
  { value: 'loan_amount', label: 'Loan Amount' },
  { value: 'fico_score', label: 'FICO Score' },
  { value: 'original_apr', label: 'APR' },
];

const LOAN_TYPES: SelectOption[] = [
  { value: 'CONVENTIONAL', label: 'Conventional' },
  { value: 'FHA', label: 'FHA' },
  { value: 'VA', label: 'VA' },
  { value: 'JUMBO', label: 'Jumbo' },
];

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

interface Filters {
  use_preferences: boolean;
  location?: string;
  min_fico?: number;
  max_fico?: number;
  min_amount?: number;
  max_amount?: number;
  max_apr?: number;
  loan_type?: string;
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

const LoanCard = ({ 
  loan, 
  bidAmount, 
  onBidAmountChange, 
  onBidSubmit, 
  isSubmitting,
  currentUser 
}: { 
  loan: CompetitiveLoan;
  bidAmount: number | '';
  onBidAmountChange: (value: number | '') => void;
  onBidSubmit: () => void;
  isSubmitting: boolean;
  currentUser: any;
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return '0.00%';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '0.00%';
    return `${numValue.toFixed(2)}%`;
  };

  const getTimeRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return 'No deadline';
    const remaining = new Date(expiresAt).getTime() - new Date().getTime();
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h remaining`;
    }
    return `${hours}h remaining`;
  };

  const isMyBidLeading = loan.current_leader?.id === currentUser?.loan_officer_profile?.id;
  const canPlaceBid = !isSubmitting && 
    bidAmount !== '' && 
    (!loan.lowest_bid_apr || bidAmount < loan.lowest_bid_apr) &&
    bidAmount < loan.original_apr &&
    loan.current_bid_count < loan.max_bids;

  const getStatusColor = () => {
    if (isMyBidLeading) return 'bg-green-100 text-green-800';
    if (loan.current_bid_count >= loan.max_bids) return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getStatusText = () => {
    if (isMyBidLeading) return 'Leading';
    if (loan.current_bid_count >= loan.max_bids) return 'Full';
    return `${loan.current_bid_count}/${loan.max_bids} Bids`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:border-blue-200 hover:shadow-md transition-all duration-200 flex flex-col h-full group">
      {/* Header */}
      <div className="p-5 border-b border-gray-50">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg group-hover:from-blue-100 group-hover:to-blue-200 transition-colors duration-200">
              <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                  {loan.loan_type} Loan
                </h3>
                <div className="flex items-center space-x-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor()} transition-colors duration-200`}>
                    {getStatusText()}
                  </span>
                  {loan.current_bid_count > 0 && (
                    <span className="text-xs text-gray-500">
                      ({loan.current_bid_count}/{loan.max_bids})
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center mt-1 text-sm text-gray-500">
                <MapPinIcon className="h-4 w-4 mr-1" />
                {loan.location}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
              {formatCurrency(loan.loan_amount)}
            </div>
            <div className="mt-1 space-y-0.5">
              <div className="text-sm text-gray-600">
                {formatPercentage(loan.original_apr)} APR
              </div>
              {loan.lowest_bid_apr && (
                <div className="text-sm font-medium text-green-600 flex items-center justify-end">
                  <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                  {formatPercentage(loan.lowest_bid_apr)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="flex items-center p-2.5 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors duration-200">
            <ChartBarIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200 mr-2" />
            <div>
              <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                {loan.fico_score}
              </div>
              <div className="text-xs text-gray-500 group-hover:text-blue-500 transition-colors duration-200">FICO</div>
            </div>
          </div>
          
          <div className="flex items-center p-2.5 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors duration-200">
            <HomeIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200 mr-2" />
            <div>
              <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                {formatCurrency(loan.property_value || 0)}
              </div>
              <div className="text-xs text-gray-500 group-hover:text-blue-500 transition-colors duration-200">Value</div>
            </div>
          </div>
          
          <div className="flex items-center p-2.5 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors duration-200">
            <CurrencyDollarIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200 mr-2" />
            <div>
              <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                {formatCurrency(loan.monthly_payment || 0)}
              </div>
              <div className="text-xs text-gray-500 group-hover:text-blue-500 transition-colors duration-200">Monthly</div>
            </div>
          </div>
          
          <div className="flex items-center p-2.5 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors duration-200">
            <ArrowTrendingUpIcon className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors duration-200 mr-2" />
            <div>
              <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                {formatPercentage(loan.debt_to_income_ratio || 0)}
              </div>
              <div className="text-xs text-gray-500 group-hover:text-blue-500 transition-colors duration-200">DTI</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 bg-gradient-to-b from-gray-50 to-white mt-auto group-hover:from-blue-50 group-hover:to-white transition-colors duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <ClockIcon className="h-4 w-4 mr-1.5 group-hover:text-blue-500 transition-colors duration-200" />
            {getTimeRemaining(loan.expires_at)}
          </div>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={loan.lowest_bid_apr || loan.original_apr}
              value={bidAmount}
              onChange={(e) => onBidAmountChange(e.target.value ? parseFloat(e.target.value) : '')}
              className="block w-full pr-16 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 group-hover:border-blue-300 transition-colors duration-200"
              disabled={isSubmitting}
              placeholder={`Below ${formatPercentage(loan.lowest_bid_apr || loan.original_apr)}`}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-500 sm:text-sm">APR</span>
            </div>
          </div>

          <Button
            onClick={onBidSubmit}
            disabled={!canPlaceBid}
            className={`w-full transition-colors duration-200 ${
              canPlaceBid 
                ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white' 
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                Placing Bid...
              </div>
            ) : (
              'Place Bid'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Add new loading state and skeleton components
const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-48 bg-gray-200 rounded-xl"></div>
    <div className="h-48 bg-gray-200 rounded-xl"></div>
    <div className="h-48 bg-gray-200 rounded-xl"></div>
  </div>
);

export default function CompetitiveLoans() {
  const router = useRouter();
  const { loanOfficer } = useLoanOfficer();
  const [loans, setLoans] = useState<CompetitiveLoan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bidAmounts, setBidAmounts] = useState<BidAmounts>({});
  const [submittingBids, setSubmittingBids] = useState<{ [key: number]: boolean }>({});
  const [filters, setFilters] = useState<Filters>({
    use_preferences: false,
    sort_by: 'created_at',
    sort_order: 'desc'
  });
  const [showFilters, setShowFilters] = useState(true);

  // Handle real-time bid updates
  const handleBidUpdate = useCallback((updatedLoan: Partial<CompetitiveLoan>) => {
    setLoans(prevLoans => 
      prevLoans.map(loan => {
        if (loan.id === updatedLoan.id) {
          return {
            ...loan,
            ...updatedLoan
          };
        }
        return loan;
      })
    );
  }, []);

  // Initialize bid updates WebSocket
  const { isConnected: isBidSocketConnected } = useBidUpdates({
    onBidUpdate: handleBidUpdate
  });

  // Fetch loans with current filters
  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      const response = await loansService.fetchCompetitiveLoans(filters);
      setLoans(response.loans);
    } catch (error) {
      toast.error('Failed to fetch loans');
      console.error('Error fetching loans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [filters]);

  const handleBidAmountChange = (loanId: number, value: number | '') => {
    setBidAmounts(prev => ({ ...prev, [loanId]: value }));
  };

  const handleBidSubmit = async (loanId: number) => {
    const bidAmount = bidAmounts[loanId];
    if (bidAmount === '' || bidAmount === undefined) return;

    setSubmittingBids(prev => ({ ...prev, [loanId]: true }));
    try {
      await loansService.placeBid(loanId, bidAmount);
      toast.success('Bid placed successfully');
      // Don't need to fetch loans here as we'll get the update via WebSocket
      setBidAmounts(prev => ({ ...prev, [loanId]: '' }));
    } catch (error) {
      toast.error('Failed to place bid');
      console.error('Error placing bid:', error);
    } finally {
      setSubmittingBids(prev => ({ ...prev, [loanId]: false }));
    }
  };

  const resetFilters = () => {
    setFilters({
      use_preferences: false,
      sort_by: 'created_at',
      sort_order: 'desc'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Competitive Loans</h1>
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
            className="flex items-center space-x-2 border-gray-200 hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </Button>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              {showFilters ? (
                <ChevronUpIcon className="h-5 w-5" />
              ) : (
                <ChevronDownIcon className="h-5 w-5" />
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="space-y-6">
              {/* First Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preferences
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={filters.use_preferences}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        use_preferences: e.target.checked
                      }))}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Apply My Preferences</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loan Type
                  </label>
                  <Select
                    options={LOAN_TYPES}
                    isClearable
                    placeholder="Select loan type"
                    className="text-sm"
                    classNamePrefix="select"
                    styles={selectStyles}
                    theme={selectTheme}
                    instanceId="loan-type-select"
                    value={LOAN_TYPES.find(type => type.value === filters.loan_type)}
                    onChange={(selected) => setFilters(prev => ({
                      ...prev,
                      loan_type: selected?.value
                    }))}
                    aria-label="Loan type filter"
                    aria-describedby="loan-type-description"
                    isSearchable={false}
                    components={{
                      IndicatorSeparator: () => null
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort By
                  </label>
                  <div className="flex space-x-2">
                    <Select
                      options={SORT_OPTIONS}
                      className="flex-1 text-sm"
                      classNamePrefix="select"
                      styles={selectStyles}
                      theme={selectTheme}
                      instanceId="sort-by-select"
                      value={SORT_OPTIONS.find(option => option.value === filters.sort_by)}
                      onChange={(selected) => setFilters(prev => ({
                        ...prev,
                        sort_by: selected?.value || 'created_at'
                      }))}
                      aria-label="Sort by"
                      aria-describedby="sort-by-description"
                      isSearchable={false}
                      defaultValue={SORT_OPTIONS.find(option => option.value === 'created_at')}
                      components={{
                        IndicatorSeparator: () => null
                      }}
                    />
                    <Button
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        sort_order: prev.sort_order === 'asc' ? 'desc' : 'asc'
                      }))}
                      variant="outline"
                      size="icon"
                      className="border-gray-200 hover:bg-gray-50"
                    >
                      {filters.sort_order === 'asc' ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    FICO Score Range
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.min_fico || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        min_fico: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                      className="w-1/2 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.max_fico || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        max_fico: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                      className="w-1/2 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loan Amount Range
                  </label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="Min ($)"
                      value={filters.min_amount || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        min_amount: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                      className="w-1/2 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Input
                      type="number"
                      placeholder="Max ($)"
                      value={filters.max_amount || ''}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        max_amount: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                      className="w-1/2 bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max APR (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Enter max APR"
                    value={filters.max_apr || ''}
                    onChange={(e) => setFilters(prev => ({
                      ...prev,
                      max_apr: e.target.value ? parseFloat(e.target.value) : undefined
                    }))}
                    className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  onClick={resetFilters}
                  variant="outline"
                  className="flex items-center space-x-2 border-gray-200 hover:bg-gray-50"
                >
                  <XMarkIcon className="h-4 w-4" />
                  <span>Reset Filters</span>
                </Button>
                <Button
                  onClick={fetchLoans}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white"
                >
                  <CheckBadgeIcon className="h-4 w-4" />
                  <span>Apply Filters</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Loans Grid */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : loans.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
              <FunnelIcon className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No loans match your criteria
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Try adjusting your filters or removing some criteria
            </p>
            <Button
              onClick={resetFilters}
              variant="outline"
              className="inline-flex items-center space-x-2 border-gray-200 hover:bg-gray-50"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Reset Filters</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loans.map((loan) => (
              <LoanCard
                key={loan.id}
                loan={loan}
                bidAmount={bidAmounts[loan.id] || ''}
                onBidAmountChange={(value) => handleBidAmountChange(loan.id, value)}
                onBidSubmit={() => handleBidSubmit(loan.id)}
                isSubmitting={submittingBids[loan.id] || false}
                currentUser={loanOfficer}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 