import { api } from './api';
import { GuaranteedLoansResponse, CompetitiveLoan, WonLoan } from '@/types/loans';

interface CompetitiveLoansFilters {
  use_preferences?: boolean;
  location?: string;
  min_fico?: number;
  max_fico?: number;
  min_amount?: number;
  max_amount?: number;
  max_apr?: number;
  loan_type?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

interface CompetitiveLoansResponse {
  loans: CompetitiveLoan[];
  total_count: number;
  filtered_by_preferences: boolean;
}

export const loansService = {
  async fetchGuaranteedLoans(): Promise<GuaranteedLoansResponse> {
    const response = await api.get('/loans/guaranteed_loans/');
    return response.data;
  },

  async fetchCompetitiveLoans(filters?: CompetitiveLoansFilters): Promise<CompetitiveLoansResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.use_preferences !== undefined) {
        params.append('use_preferences', filters.use_preferences.toString());
      }
      if (filters.location) {
        params.append('location', filters.location);
      }
      if (filters.min_fico) {
        params.append('min_fico', filters.min_fico.toString());
      }
      if (filters.max_fico) {
        params.append('max_fico', filters.max_fico.toString());
      }
      if (filters.min_amount) {
        params.append('min_amount', filters.min_amount.toString());
      }
      if (filters.max_amount) {
        params.append('max_amount', filters.max_amount.toString());
      }
      if (filters.max_apr) {
        params.append('max_apr', filters.max_apr.toString());
      }
      if (filters.loan_type) {
        params.append('loan_type', filters.loan_type);
      }
      if (filters.sort_by) {
        params.append('sort_by', filters.sort_by);
      }
      if (filters.sort_order) {
        params.append('sort_order', filters.sort_order);
      }
    }

    const queryString = params.toString();
    const url = `/loans/competitive_loans/${queryString ? `?${queryString}` : ''}`;
    const response = await api.get(url);
    return response.data;
  },

  async fetchWonLoans(): Promise<WonLoan[]> {
    const response = await api.get('/loans/won_loans/');
    return response.data;
  },

  async placeBid(loanId: number, bidApr: number) {
    const response = await api.post(`/loans/${loanId}/place_bid/`, {
      bid_apr: bidApr
    });
    return response.data;
  }
}; 