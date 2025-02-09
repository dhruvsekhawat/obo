export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'LOAN_OFFICER' | 'BORROWER';
  is_verified: boolean;
  loan_officer_profile?: LoanOfficerProfile;
  preferences?: LoanOfficerPreferences;
}

export interface LoanOfficerProfile {
  id: number;
  nmls_id: string;
  company_name: string | null;
  subscription_plan: 'BASIC' | 'PREMIUM';
  total_loans_funded: number;
  success_rate: number;
  date_of_birth?: string;
  license_expiry?: string;
  years_of_experience: number;
  specialties: string[];
  service_areas: string[];
  bio: string;
  profile_image: string;
  is_active: boolean;
  profile_completed: boolean;
  phone_number: string | null;
  
  // Performance metrics
  active_bids_count: number;
  total_loans_won: number;
  total_guaranteed_leads: number;
  total_competitive_wins: number;
  average_loan_amount: number | null;
  total_value: number;
}

export interface LoanOfficerPreferences {
  // Loan Types
  conventional_enabled: boolean;
  fha_enabled: boolean;
  va_enabled: boolean;
  jumbo_enabled: boolean;
  priority_loan_type: 'conventional' | 'fha' | 'va' | 'jumbo';

  // Geographic Preferences
  regions: string[];  // List of state codes
  open_to_all_regions: boolean;

  // Loan Amount Range
  min_loan_amount: number;
  max_loan_amount: number;

  // FICO Score Range
  min_fico_score: number;
  max_fico_score: number;

  // APR Threshold
  max_apr_threshold: number;

  // Notification Preferences
  notify_guaranteed_loans: boolean;
  notify_competitive_loans: boolean;
  notify_bid_updates: boolean;

  // Communication Preferences
  communicate_via_email: boolean;
  communicate_via_sms: boolean;
  communicate_via_dashboard: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'LOAN_OFFICER' | 'BORROWER';
  phone_number?: string;
  company_name?: string;
  nmls_id?: string;
  years_of_experience?: number;
}

export interface AuthResponse {
  success: boolean;
  access: string;
  message: string;
  token: string;
  user: User;
}

export interface LoanOfficerMetrics {
  active_bids_count: number;
  total_loans_won: number;
  success_rate: number;
  total_value: number;
  recent_bids: {
    id: number;
    loan_id: number;
    bid_apr: number;
    created_at: string;
    status: string;
  }[];
}

export interface GuaranteedAllocation {
  credits_available: number;
  credits_used: number;
  reset_date: string;
} 