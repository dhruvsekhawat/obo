'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { authService } from '@/services/auth';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { 
  BellIcon, 
  EnvelopeIcon, 
  ChatBubbleLeftIcon,
  DevicePhoneMobileIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  BuildingLibraryIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import Select from 'react-select';

interface LoanTypes {
  conventional: boolean;
  fha: boolean;
  va: boolean;
  jumbo: boolean;
  priority: 'conventional' | 'fha' | 'va' | 'jumbo';
}

interface Preferences {
  loan_types: LoanTypes;
  regions: string[];
  open_to_all_regions: boolean;
  min_loan_amount: number;
  max_loan_amount: number;
  min_fico_score: number;
  max_fico_score: number;
  max_apr_threshold: number;
  notification_preferences: {
    guaranteed_loans: boolean;
    competitive_loans: boolean;
    bid_updates: boolean;
  };
  communication_preferences: {
    email: boolean;
    sms: boolean;
    dashboard: boolean;
  };
}

const LOAN_TYPE_INFO = {
  conventional: 'Traditional mortgage loans not backed by government agencies, typically requiring good credit scores.',
  fha: 'Federal Housing Administration loans with lower down payment requirements, ideal for first-time homebuyers.',
  va: 'Veterans Affairs loans for military service members and veterans with competitive terms.',
  jumbo: 'Loans exceeding conforming loan limits, typically used for high-value properties.'
};

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' }
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('preferences');
  const [expandedSections, setExpandedSections] = useState<string[]>(['loan_types']);
  const [preferences, setPreferences] = useState<Preferences>({
    loan_types: {
      conventional: true,
      fha: true,
      va: true,
      jumbo: true,
      priority: 'conventional'
    },
    regions: [],
    open_to_all_regions: true,
    min_loan_amount: 100000,
    max_loan_amount: 1000000,
    min_fico_score: 620,
    max_fico_score: 850,
    max_apr_threshold: 7.00,
    notification_preferences: {
      guaranteed_loans: true,
      competitive_loans: true,
      bid_updates: true
    },
    communication_preferences: {
      email: true,
      sms: true,
      dashboard: true
    }
  });

  const [profileDetails, setProfileDetails] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    phone_number: user?.loan_officer_profile?.phone_number || '',
    company_name: user?.loan_officer_profile?.company_name || '',
    nmls_id: user?.loan_officer_profile?.nmls_id || '',
    years_of_experience: user?.loan_officer_profile?.years_of_experience || 0
  });

  useEffect(() => {
    const userData = authService.getUser();
    console.log('User Data:', userData);

    if (!userData) {
      router.push('/login');
      return;
    }

    if (!userData || userData.role !== 'LOAN_OFFICER') {
      toast.error('Only loan officers can access this page');
      router.push('/dashboard');
      return;
    }

    setUser(userData);
    if (userData.preferences) {
      const updatedPreferences = {
        ...preferences,
        ...userData.preferences,
        loan_types: {
          conventional: true,
          fha: true,
          va: true,
          jumbo: true,
          priority: 'conventional',
          ...(userData.preferences?.loan_types || {})
        }
      };
      setPreferences(updatedPreferences);
    }
    
    // Set profile details
    setProfileDetails({
      first_name: userData.first_name || '',
      last_name: userData.last_name || '',
      phone_number: userData.loan_officer_profile?.phone_number || '',
      company_name: userData.loan_officer_profile?.company_name || '',
      nmls_id: userData.loan_officer_profile?.nmls_id || '',
      years_of_experience: userData.loan_officer_profile?.years_of_experience || 0
    });

    // Check for new user flow
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    const isNew = searchParams.get('new');
    
    if (tab === 'profile') {
      setActiveTab('profile');
    }
    
    if (isNew === 'true' && !userData.loan_officer_profile?.profile_completed) {
      toast('Please complete your profile information to continue', {
        icon: '🔔',
        duration: 5000
      });
    }

    setIsLoading(false);
  }, [router]);

  const handleSave = async () => {
    try {
      const currentUser = authService.getUser();
      console.log('Current User before save:', currentUser);
      console.log('Token:', authService.getToken());

      if (!currentUser || currentUser.role !== 'LOAN_OFFICER') {
        toast.error('Only loan officers can update preferences');
        return;
      }

      setIsSaving(true);
      const response = await authService.updatePreferences(preferences);
      
      if (currentUser) {
        const updatedUser = {
          ...currentUser,
          preferences: response
        };
        authService.setUser(updatedUser);
      }
      
      toast.success('Preferences saved successfully');
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      console.error('Error response:', error.response);
      if (error.response?.status === 403) {
        toast.error('Only loan officers can update preferences. Please ensure you are logged in as a loan officer.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to save preferences');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      // Validate required fields
      if (!profileDetails.first_name || !profileDetails.last_name || 
          !profileDetails.phone_number || !profileDetails.company_name || 
          !profileDetails.nmls_id || !profileDetails.years_of_experience) {
        toast.error('Please fill in all required fields');
        return;
      }

      setIsSaving(true);
      const response = await authService.updateProfile(profileDetails);
      
      if (response.success) {
        const currentUser = authService.getUser();
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            first_name: profileDetails.first_name,
            last_name: profileDetails.last_name,
            loan_officer_profile: {
              ...currentUser.loan_officer_profile,
              phone_number: profileDetails.phone_number,
              company_name: profileDetails.company_name,
              nmls_id: profileDetails.nmls_id,
              years_of_experience: profileDetails.years_of_experience,
              profile_completed: true
            }
          };
          authService.setUser(updatedUser);
        }
        toast.success('Profile updated successfully');
        
        // If this was a new user completing their profile, redirect to dashboard
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('new') === 'true') {
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const getSelectedLoanTypes = () => {
    return Object.entries(preferences.loan_types)
      .filter(([key, value]) => key !== 'priority' && value)
      .map(([key]) => key);
  };

  const renderSectionHeader = (title: string, section: string, icon: React.ElementType) => {
    const Icon = icon;
    const isExpanded = expandedSections.includes(section);
    
    return (
      <button
        onClick={() => toggleSection(section)}
        className="flex items-center justify-between w-full p-4 hover:bg-gray-50 focus:outline-none"
      >
        <div className="flex items-center">
          <Icon className="h-6 w-6 text-blue-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </button>
    );
  };

  const renderLoanTypePreferences = () => (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg">
      {renderSectionHeader('Loan Type Preferences', 'loan_types', BuildingLibraryIcon)}
      {expandedSections.includes('loan_types') && preferences.loan_types && (
        <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(preferences.loan_types).map(([key, value]) => (
              key !== 'priority' && (
                <div key={key} className="relative group">
                  <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors">
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        loan_types: {
                          ...preferences.loan_types,
                          [key]: e.target.checked
                        }
                      })}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {key} Loans
                    </span>
                    <InformationCircleIcon 
                      className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={LOAN_TYPE_INFO[key as keyof typeof LOAN_TYPE_INFO]}
                    />
                  </label>
                </div>
              )
            ))}
          </div>

          {getSelectedLoanTypes().length > 1 && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Loan Type
              </label>
              <select
                value={preferences.loan_types.priority}
                onChange={(e) => setPreferences({
                  ...preferences,
                  loan_types: {
                    ...preferences.loan_types,
                    priority: e.target.value as 'conventional' | 'fha' | 'va' | 'jumbo'
                  }
                })}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                {getSelectedLoanTypes().map(type => (
                  <option key={type} value={type} className="capitalize">
                    {type} Loans
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Select which loan type you'd like to prioritize when matching with borrowers.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderGeographicPreferences = () => (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg">
      {renderSectionHeader('Geographic Preferences', 'geographic', MapPinIcon)}
      {expandedSections.includes('geographic') && (
        <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
          <div className="space-y-6">
            <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors">
              <input
                type="checkbox"
                checked={preferences.open_to_all_regions}
                onChange={(e) => setPreferences({
                  ...preferences,
                  open_to_all_regions: e.target.checked
                })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Open to all regions
              </span>
            </label>

            {!preferences.open_to_all_regions && (
              <div className="mt-6 relative z-50">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Preferred States
                </label>
                <div className="relative">
                  <Select
                    isMulti
                    options={US_STATES}
                    value={US_STATES.filter(state => 
                      preferences.regions.includes(state.value)
                    )}
                    onChange={(selected) => setPreferences({
                      ...preferences,
                      regions: selected.map(option => option.value)
                    })}
                    className="basic-multi-select"
                    classNamePrefix="select"
                    styles={{
                      control: (base) => ({
                        ...base,
                        borderColor: '#E5E7EB',
                        '&:hover': {
                          borderColor: '#3B82F6'
                        }
                      }),
                      multiValue: (base) => ({
                        ...base,
                        backgroundColor: '#EFF6FF',
                        borderRadius: '0.375rem'
                      }),
                      multiValueLabel: (base) => ({
                        ...base,
                        color: '#1D4ED8',
                        padding: '0.25rem'
                      }),
                      multiValueRemove: (base) => ({
                        ...base,
                        color: '#1D4ED8',
                        ':hover': {
                          backgroundColor: '#DBEAFE',
                          color: '#1E40AF'
                        }
                      }),
                      menu: (base) => ({
                        ...base,
                        zIndex: 999,
                        position: 'absolute',
                        width: '100%',
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '0.375rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        marginTop: '4px'
                      }),
                      menuList: (base) => ({
                        ...base,
                        padding: '0.5rem',
                        maxHeight: '250px'
                      }),
                      option: (base, state) => ({
                        ...base,
                        backgroundColor: state.isSelected ? '#EFF6FF' : state.isFocused ? '#F3F4F6' : 'white',
                        color: state.isSelected ? '#1D4ED8' : '#374151',
                        padding: '0.5rem',
                        borderRadius: '0.25rem',
                        '&:active': {
                          backgroundColor: '#DBEAFE'
                        }
                      })
                    }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Select the states where you're licensed and prefer to operate.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const renderLoanAmountRange = () => (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg">
      {renderSectionHeader('Loan Amount Range', 'loan_amount', CurrencyDollarIcon)}
      {expandedSections.includes('loan_amount') && (
        <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Loan Amount Range: ${preferences.min_loan_amount.toLocaleString()} - ${preferences.max_loan_amount.toLocaleString()}
              </label>
              <Slider
                range
                min={10000}
                max={5000000}
                step={10000}
                value={[preferences.min_loan_amount, preferences.max_loan_amount]}
                onChange={(value: number | number[]) => {
                  if (Array.isArray(value)) {
                    setPreferences({
                      ...preferences,
                      min_loan_amount: value[0],
                      max_loan_amount: value[1]
                    });
                  }
                }}
                className="mb-6"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Amount
                </label>
                <Input
                  type="number"
                  value={preferences.min_loan_amount}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value <= preferences.max_loan_amount) {
                      setPreferences({
                        ...preferences,
                        min_loan_amount: value
                      });
                    }
                  }}
                  min={10000}
                  max={preferences.max_loan_amount}
                  step={10000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Amount
                </label>
                <Input
                  type="number"
                  value={preferences.max_loan_amount}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value >= preferences.min_loan_amount) {
                      setPreferences({
                        ...preferences,
                        max_loan_amount: value
                      });
                    }
                  }}
                  min={preferences.min_loan_amount}
                  max={5000000}
                  step={10000}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFICOScoreRange = () => (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg">
      {renderSectionHeader('FICO Score Range', 'fico', ChartBarIcon)}
      {expandedSections.includes('fico') && (
        <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                FICO Score Range: {preferences.min_fico_score} - {preferences.max_fico_score}
              </label>
              <Slider
                range
                min={300}
                max={850}
                value={[preferences.min_fico_score, preferences.max_fico_score]}
                onChange={(value: number | number[]) => {
                  if (Array.isArray(value)) {
                    setPreferences({
                      ...preferences,
                      min_fico_score: value[0],
                      max_fico_score: value[1]
                    });
                  }
                }}
                className="mb-6"
              />
              {preferences.min_fico_score < 580 && (
                <p className="text-sm text-yellow-600 mt-2">
                  Note: A FICO score below 580 is typically considered poor credit.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderNotificationPreferences = () => (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg">
      {renderSectionHeader('Notification Preferences', 'notifications', BellIcon)}
      {expandedSections.includes('notifications') && (
        <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
          <div className="space-y-4">
            {Object.entries(preferences.notification_preferences).map(([key, value]) => (
              <label key={key} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setPreferences({
                    ...preferences,
                    notification_preferences: {
                      ...preferences.notification_preferences,
                      [key]: e.target.checked
                    }
                  })}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700 capitalize flex items-center">
                    <BellIcon className="h-5 w-5 mr-2 text-gray-400" />
                    {key.replace(/_/g, ' ')}
                  </span>
                  <p className="mt-1 text-sm text-gray-500">
                    {key === 'guaranteed_loans' ? 'Get notified when new guaranteed loans match your preferences' :
                     key === 'competitive_loans' ? 'Receive alerts for new competitive loan opportunities' :
                     key === 'bid_updates' ? 'Stay informed about the status of your bids and when you\'re outbid' : ''}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderCommunicationPreferences = () => (
    <div className="bg-white overflow-hidden shadow-sm rounded-lg">
      {renderSectionHeader('Communication Preferences', 'communication', ChatBubbleLeftIcon)}
      {expandedSections.includes('communication') && (
        <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
          <div className="space-y-4">
            <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors">
              <input
                type="checkbox"
                checked={preferences.communication_preferences.email}
                onChange={(e) => setPreferences({
                  ...preferences,
                  communication_preferences: {
                    ...preferences.communication_preferences,
                    email: e.target.checked
                  }
                })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 flex items-center">
                  <EnvelopeIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Email notifications
                </span>
                <p className="mt-1 text-sm text-gray-500">
                  Receive detailed updates and notifications via email
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors">
              <input
                type="checkbox"
                checked={preferences.communication_preferences.sms}
                onChange={(e) => setPreferences({
                  ...preferences,
                  communication_preferences: {
                    ...preferences.communication_preferences,
                    sms: e.target.checked
                  }
                })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 flex items-center">
                  <DevicePhoneMobileIcon className="h-5 w-5 mr-2 text-gray-400" />
                  SMS notifications
                </span>
                <p className="mt-1 text-sm text-gray-500">
                  Get instant alerts via text message for time-sensitive updates
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors">
              <input
                type="checkbox"
                checked={preferences.communication_preferences.dashboard}
                onChange={(e) => setPreferences({
                  ...preferences,
                  communication_preferences: {
                    ...preferences.communication_preferences,
                    dashboard: e.target.checked
                  }
                })}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-700 flex items-center">
                  <ChatBubbleLeftIcon className="h-5 w-5 mr-2 text-gray-400" />
                  Dashboard notifications
                </span>
                <p className="mt-1 text-sm text-gray-500">
                  See notifications in your dashboard when you log in
                </p>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );

  const tabs = [
    {
      id: 'preferences',
      name: 'Loan Preferences',
      icon: BuildingLibraryIcon
    },
    {
      id: 'profile',
      name: 'Profile Details',
      icon: UserCircleIcon
    },
    {
      id: 'settings',
      name: 'Account Settings',
      icon: Cog6ToothIcon
    }
  ];

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 sm:px-0 mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your preferences and account settings.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon
                    className={`
                      -ml-0.5 mr-2 h-5 w-5
                      ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="px-4 sm:px-0">
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {renderLoanTypePreferences()}
              {renderGeographicPreferences()}
              {renderLoanAmountRange()}
              {renderFICOScoreRange()}
              {renderNotificationPreferences()}
              {renderCommunicationPreferences()}
            </div>
          )}
          {activeTab === 'profile' && (
            <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    First Name
                  </label>
                  <Input
                    type="text"
                    value={profileDetails.first_name}
                    onChange={(e) => setProfileDetails({
                      ...profileDetails,
                      first_name: e.target.value
                    })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    value={profileDetails.last_name}
                    onChange={(e) => setProfileDetails({
                      ...profileDetails,
                      last_name: e.target.value
                    })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    value={profileDetails.phone_number}
                    onChange={(e) => setProfileDetails({
                      ...profileDetails,
                      phone_number: e.target.value
                    })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company Name
                  </label>
                  <Input
                    type="text"
                    value={profileDetails.company_name}
                    onChange={(e) => setProfileDetails({
                      ...profileDetails,
                      company_name: e.target.value
                    })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    NMLS ID
                  </label>
                  <Input
                    type="text"
                    value={profileDetails.nmls_id}
                    onChange={(e) => setProfileDetails({
                      ...profileDetails,
                      nmls_id: e.target.value
                    })}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Years of Experience
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={profileDetails.years_of_experience}
                    onChange={(e) => setProfileDetails({
                      ...profileDetails,
                      years_of_experience: parseInt(e.target.value) || 0
                    })}
                    className="mt-1"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleProfileUpdate}
                  isLoading={isSaving}
                >
                  Update Profile
                </Button>
              </div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="bg-white shadow-sm rounded-lg p-6">
              <p className="text-gray-500">Account settings coming soon...</p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end px-4 sm:px-0">
          <Button
            onClick={handleSave}
            isLoading={isSaving}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
} 