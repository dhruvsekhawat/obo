'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { authService } from '@/services/auth';
import type { SVGProps } from 'react';
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
  icon: React.ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const user = authService.getUser();

  useEffect(() => {
    if (!user) {
      router.push('/login');
    } else {
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
      console.log('Dashboard stats response:', data); // Debug log

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
      icon: ChartBarIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Won Loans',
      value: dashboardStats?.won_loans || 0,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Success Rate',
      value: `${(dashboardStats?.success_rate || 0).toFixed(1)}%`,
      icon: TrophyIcon,
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
      icon: CurrencyDollarIcon,
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

  if (isLoading || !user) return null;

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
                        {user?.first_name} {user?.last_name}
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
            Welcome back, {user?.first_name}
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
                    {React.createElement(stat.icon, {
                      className: "h-6 w-6 text-white",
                      "aria-hidden": "true"
                    })}
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

        {/* Quick Actions */}
        <div className="px-4 sm:px-0 mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => router.push('/guaranteed-loans')}
              className="relative group bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
            >
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                View Guaranteed Loans
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Browse loans that match your preferences
              </p>
              <ArrowRightIcon className="h-5 w-5 text-blue-500 absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
            <button
              onClick={() => router.push('/competitive-loans')}
              className="relative group bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
            >
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                Browse Competitive Loans
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Explore and bid on available loan opportunities
              </p>
              <ArrowRightIcon className="h-5 w-5 text-blue-500 absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="px-4 sm:px-0">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul role="list" className="divide-y divide-gray-200">
              {dashboardStats?.recent_activity?.length ? (
                dashboardStats.recent_activity.map((activity) => (
                  <li key={activity.id}>
                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <ChartBarIcon 
                            className={`h-5 w-5 ${
                              activity.status === 'ACCEPTED' ? 'text-green-500' :
                              activity.status === 'OUTBID' ? 'text-red-500' :
                              'text-blue-500'
                            }`}
                            aria-hidden="true"
                          />
                          <p className="ml-2 text-sm font-medium text-gray-900">
                            {activity.description}
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="text-sm text-gray-500">
                            {activity.date}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li>
                  <div className="px-4 py-4 sm:px-6 text-center text-gray-500">
                    No recent activity
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
