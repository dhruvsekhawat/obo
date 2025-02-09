export interface Borrower {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  credit_score: number | null;
  annual_income: number | null;
  employment_status: string;
  property_type: string;
  property_use: string;
  created_at: string;
  updated_at: string;
}

export interface Loan {
  id: number;
  borrower: Borrower;
  loan_amount: number;
  original_apr: number;
  lowest_bid_apr: number | null;
  location: string;
  status: 'AVAILABLE' | 'PENDING' | 'CLOSED' | 'EXPIRED';
  fico_score: number;
  lead_type: 'COMPETITIVE' | 'GUARANTEED';
  max_bids: number;
  current_bid_count: number;
  is_guaranteed: boolean;
  current_leader: {
    id: number;
    user: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
    };
  } | null;
  is_closed: boolean;
  winning_bid: {
    id: number;
    bid_apr: number;
    created_at: string;
  } | null;

  // Additional loan details
  loan_type: 'CONVENTIONAL' | 'FHA' | 'VA' | 'JUMBO';
  loan_term: number | null;
  property_value: number | null;
  down_payment: number | null;
  monthly_payment: number | null;
  debt_to_income_ratio: number | null;

  // Document tracking
  loan_estimate_document: string;
  additional_documents: string[];

  // Timestamps
  expires_at: string | null;
  created_at: string;
  updated_at: string;

  // Routing fields
  routing_score: number | null;
  routing_priority: number;
  auto_assignment_attempts: number;
}

export interface CompetitiveLoan extends Loan {
  current_best_offer?: {
    apr: number;
    loan_officer: string;
  };
  my_current_bid?: {
    apr: number;
    is_winning: boolean;
  };
}

export interface GuaranteedLoan extends Loan {
  routing_score: number;
  routing_priority: number;
}

export interface GuaranteedLoansResponse {
  loans: GuaranteedLoan[];
  credits_available: number;
  credits_used: number;
  reset_date: string;
}

export interface WonLoan extends Loan {
  winning_bid: {
    id: number;
    bid_apr: number;
    created_at: string;
  };
}

export interface Bid {
  id: number;
  loan: Loan;
  loan_officer: {
    id: number;
    user: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  bid_apr: number;
  status: 'ACTIVE' | 'OUTBID' | 'ACCEPTED' | 'REJECTED';
  is_lowest: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompetitiveLoansResponse {
  loans: CompetitiveLoan[];
  total_count: number;
  filtered_by_preferences: boolean;
} 