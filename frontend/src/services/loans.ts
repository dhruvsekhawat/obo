import { api } from './api';
import { GuaranteedLoansResponse, CompetitiveLoan, WonLoan } from '@/types/loans';

export const loansService = {
  async fetchGuaranteedLoans(): Promise<GuaranteedLoansResponse> {
    const response = await api.get('/loans/guaranteed_loans/');
    return response.data;
  },

  async fetchCompetitiveLoans(): Promise<CompetitiveLoan[]> {
    const response = await api.get('/loans/competitive_loans/');
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