export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'LOAN_OFFICER' | 'BORROWER';
  is_verified: boolean;
  loan_officer_profile?: LoanOfficerProfile;
}

export interface LoanOfficerProfile {
  id: number;
  nmls_id: string;
  company_name: string;
  phone_number: string;
  years_of_experience: number;
  is_active: boolean;
  profile_completed: boolean;
  subscription_plan: 'FREE' | 'BASIC' | 'PREMIUM';
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
  role: 'LOAN_OFFICER';
  phone_number: string;
  loan_officer_profile: {
    nmls_id: string;
    company_name: string;
    years_of_experience: number;
  };
}

export interface AuthResponse {
  success: boolean;
  message: string;
  access: string;
  refresh: string;
  user: User;
} 