import { api } from './api';
import { UserProfile, LoanOfficerPreferences } from '@/types/auth';

export const profileService = {
  async fetchUserProfile(): Promise<UserProfile> {
    const response = await api.get('/auth/user/');
    return response.data;
  },

  async updateProfile(formData: Partial<UserProfile>) {
    const response = await api.patch('/auth/profile/', formData);
    return response.data;
  },

  async updatePreferences(preferences: LoanOfficerPreferences) {
    const response = await api.post('/auth/loan_officer/preferences/', preferences);
    return response.data;
  },

  async fetchPreferences(): Promise<LoanOfficerPreferences> {
    const response = await api.get('/auth/loan_officer/preferences/');
    return response.data;
  }
}; 