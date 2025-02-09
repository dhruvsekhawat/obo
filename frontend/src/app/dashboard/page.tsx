'use client';

import { FC, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { authService } from '@/services/auth';
import type { SVGProps } from 'react';
import type { User } from '@/types/auth';
import {
  ChartBarIcon,
  CheckCircleIcon,
  TrophyIcon,
  CurrencyDollarIcon,
  ArrowRightIcon,
  UserCircleIcon,
  ChevronDownIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  BanknotesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';

const NotificationBell = dynamic(
  () => import('@/components/notifications/NotificationBell'),
  { ssr: false }
);

interface DashboardStats {
  active_bids: number;
  won_loans: number;
  success_rate: number;
  total_value: number;
  recent_activity: Array<{
    id: number;
    description: string;
    date: string;
    status: string;
  }>;
}

interface StatItem {
  name: string;
  value: string | number;
  icon: FC<SVGProps<SVGSVGElement>>;
  color: string;
}

const DashboardPage: FC = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = authService.getUser();
    if (!userData) {
      router.push('/login');
    } else {
      setUser(userData);
      fetchDashboardStats();
    }
  }, [router]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/loan_officer/profile/`, {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to fetch profile stats');
      const data = await response.json();
      console.log('Dashboard stats response:', data);

      setDashboardStats({
        active_bids: data.active_bids_count || 0,
        won_loans: data.total_loans_won || 0,
        success_rate: data.success_rate || 0,
        total_value: data.total_value || 0,
        recent_activity: data.recent_bids?.map((bid: any) => ({
          id: bid.id,
          description: `Placed a bid of ${bid.bid_apr}% APR on loan #${bid.loan_id}${
            bid.status === 'ACCEPTED' ? ' (Won)' : 
            bid.status === 'OUTBID' ? ' (Outbid)' : ''
          }`,
          date: new Date(bid.created_at).toLocaleString(),
          status: bid.status
        })) || []
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const stats: StatItem[] = [
    {
      name: 'Active Bids',
      value: dashboardStats?.active_bids || 0,
      icon: ChartBarIcon as FC<SVGProps<SVGSVGElement>>,
      color: 'bg-blue-500',
    },
    {
      name: 'Won Loans',
      value: dashboardStats?.won_loans || 0,
      icon: CheckCircleIcon as FC<SVGProps<SVGSVGElement>>,
      color: 'bg-green-500',
    },
    {
      name: 'Success Rate',
      value: `${(dashboardStats?.success_rate || 0).toFixed(1)}%`,
      icon: TrophyIcon as FC<SVGProps<SVGSVGElement>>,
      color: 'bg-yellow-500',
    },
    {
      name: 'Total Value',
      value: dashboardStats?.total_value 
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          }).format(dashboardStats.total_value)
        : '$0',
      icon: CurrencyDollarIcon as FC<SVGProps<SVGSVGElement>>,
      color: 'bg-purple-500',
    },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    authService.logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex-1 flex items-center justify-between">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold">Beat My Rate</h1>
              </div>
              <div className="flex items-center space-x-4">
                <NotificationBell />
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center space-x-3 focus:outline-none"
                  >
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.first_name} {user.last_name}
                      </span>
                      <ChevronDownIcon 
                        className={`ml-2 h-4 w-4 text-gray-500 transition-transform duration-200 ${
                          isProfileOpen ? 'transform rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {isProfileOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                      <button
                        onClick={() => router.push('/dashboard/profile')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <UserIcon className="h-4 w-4 mr-3 text-gray-500" />
                        Your Profile
                      </button>
                      <button
                        onClick={() => router.push('/dashboard/settings')}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Cog6ToothIcon className="h-4 w-4 mr-3 text-gray-500" />
                        Settings
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-gray-100"
                      >
                        <ArrowLeftOnRectangleIcon className="h-4 w-4 mr-3 text-red-500" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="px-4 sm:px-0 mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {user.first_name}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Here's what's happening with your loans today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8 px-4 sm:px-0">
          {stats.map((stat) => (
            <div
              key={stat.name}
              className="bg-white overflow-hidden shadow rounded-lg"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 rounded-md p-3 ${stat.color}`}>
                    <stat.icon
                      className="h-6 w-6 text-white"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {stat.name}
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {stat.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loan Type Navigation */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 mb-8 px-4 sm:px-0">
          {/* Competitive Loans Box */}
          <div 
            onClick={() => router.push('/competitive-loans')}
            className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-200"
          >
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-3 bg-blue-500">
                    <BanknotesIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-medium text-gray-900">Competitive Loans</h3>
                    <p className="text-sm text-gray-500">Bid on available loans and compete with other lenders</p>
                  </div>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Guaranteed Loans Box */}
          <div 
            onClick={() => router.push('/guaranteed-loans')}
            className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow duration-200"
          >
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 rounded-md p-3 bg-green-500">
                    <ShieldCheckIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5">
                    <h3 className="text-lg font-medium text-gray-900">Guaranteed Loans</h3>
                    <p className="text-sm text-gray-500">View and claim your guaranteed loan assignments</p>
                  </div>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg px-4 sm:px-0 mb-8">
          <div className="border-b border-gray-200">
            <div className="px-6 py-5">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Recent Activity
              </h3>
            </div>
          </div>
          <div className="px-6 py-5">
            {dashboardStats?.recent_activity && dashboardStats.recent_activity.length > 0 ? (
              <div className="flow-root">
                <ul className="-mb-8">
                  {dashboardStats.recent_activity.map((activity, activityIdx) => (
                    <li key={activity.id}>
                      <div className="relative pb-8">
                        {activityIdx !== dashboardStats.recent_activity.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`
                              h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white
                              ${activity.status === 'ACCEPTED' ? 'bg-green-500' :
                                activity.status === 'OUTBID' ? 'bg-red-500' :
                                'bg-blue-500'
                              }
                            `}>
                              {activity.status === 'ACCEPTED' ? (
                                <CheckCircleIcon className="h-5 w-5 text-white" aria-hidden="true" />
                              ) : activity.status === 'OUTBID' ? (
                                <ArrowRightIcon className="h-5 w-5 text-white" aria-hidden="true" />
                              ) : (
                                <ChartBarIcon className="h-5 w-5 text-white" aria-hidden="true" />
                              )}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div>
                              <div className="text-sm text-gray-500">
                                <time dateTime={activity.date}>{activity.date}</time>
                              </div>
                            </div>
                            <div className="mt-1">
                              <p className="text-sm text-gray-600">
                                {activity.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No recent activity to display.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

DashboardPage.displayName = 'DashboardPage';

export default DashboardPage;
