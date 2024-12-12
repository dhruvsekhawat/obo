import axios from 'axios';
import { LoginCredentials, RegisterCredentials, AuthResponse } from '@/types/auth';
import { clientStorage } from '@/utils/client-storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/auth/login/`, credentials);
    return response.data;
  },

  async register(data: RegisterCredentials): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/auth/register/`, data);
    return response.data;
  },

  async googleAuth(credential: string): Promise<AuthResponse> {
    const response = await axios.post(`${API_URL}/auth/google/`, { token: credential });
    return response.data;
  },

  async updatePreferences(preferences: any) {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      const response = await axios.put(
        `${API_URL}/auth/loan_officer/preferences/`,
        preferences,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Get current user data and update it with new preferences
      const currentUser = this.getUser();
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          preferences: response.data
        };
        this.setUser(updatedUser);
      }

      return response.data;
    } catch (error: any) {
      console.error('Preferences update error:', error.response?.data || error.message);
      throw error;
    }
  },

  async updateProfile(profileData: any) {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token found');
    }

    try {
      // First, update the loan officer profile
      const response = await axios.put(
        `${API_URL}/auth/loan_officer/profile/`,
        profileData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Get current user data
      const currentUser = this.getUser();
      if (currentUser) {
        // Update the user data with the new profile information
        const updatedUser = {
          ...currentUser,
          loan_officer_profile: {
            ...currentUser.loan_officer_profile,
            phone_number: profileData.phone_number,
            company_name: profileData.company_name,
            years_of_experience: profileData.years_of_experience,
            ...response.data
          }
        };
        this.setUser(updatedUser);
      }

      return response.data;
    } catch (error: any) {
      console.error('Profile update error:', error.response?.data || error.message);
      throw error;
    }
  },

  async logout() {
    clientStorage.removeItem('token');
    clientStorage.removeItem('user');
  },

  setToken(token: string) {
    clientStorage.setItem('token', token);
  },

  getToken(): string | null {
    return clientStorage.getItem('token');
  },

  setUser(user: any) {
    clientStorage.setItem('user', typeof user === 'string' ? user : JSON.stringify(user));
  },

  getUser() {
    const user = clientStorage.getItem('user');
    if (!user) return null;
    try {
      return typeof user === 'string' ? JSON.parse(user) : user;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}; 