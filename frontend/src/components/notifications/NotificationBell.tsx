'use client';

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { authService } from '@/services/auth';
import { notificationWebSocket } from '@/services/websocket';
import { formatDate, formatRelativeTime } from '@/utils/date';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

function NotificationBell(): JSX.Element {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    const init = async () => {
      try {
        if (!mountedRef.current) return;
        await fetchNotifications();
        
        // Setup WebSocket handlers
        const handleMessage = (data: any) => {
          if (!mountedRef.current) return;

          if (data.type === 'authentication_successful') {
            console.log('WebSocket authentication successful');
            return;
          }
          
          if (data.type === 'authentication_failed') {
            console.error('WebSocket authentication failed');
            toast.error('Failed to authenticate notification service');
            return;
          }

          if (data.type === 'notification') {
            const notification = data.notification;
            setNotifications(prev => [notification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            toast(notification.message, {
              icon: getNotificationIcon(notification.type),
              duration: 5000,
            });
          }
        };

        const handleError = (error: any) => {
          if (!mountedRef.current) return;
          console.error('WebSocket error:', error);
          toast.error('Notification service connection error');
        };

        notificationWebSocket.addMessageHandler(handleMessage);
        notificationWebSocket.addErrorHandler(handleError);
        notificationWebSocket.connect();

        return () => {
          notificationWebSocket.removeMessageHandler(handleMessage);
          notificationWebSocket.removeErrorHandler(handleError);
        };
      } catch (error) {
        console.error('Initialization error:', error);
        return undefined;
      }
    };

    const cleanup = init();

    return () => {
      mountedRef.current = false;
      if (cleanup) {
        cleanup.then(cleanupFn => {
          if (cleanupFn) cleanupFn();
        });
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = authService.getToken();
      if (!token) {
        console.log('No token available');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      if (!mountedRef.current) return;
      
      if (data.notifications) {
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count || 0);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (mountedRef.current) {
        toast.error('Failed to fetch notifications');
      }
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      notificationWebSocket.send({
        type: 'mark_read',
        notification_id: notificationId
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const clearAll = async () => {
    try {
      setIsLoading(true);
      
      // Send clear all request through WebSocket
      notificationWebSocket.send({
        type: 'mark_all_read'
      });

      // Clear notifications locally
      setNotifications([]);
      setUnreadCount(0);
      setIsOpen(false);

      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Error clearing notifications:', error);
      toast.error('Failed to clear notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'OUTBID':
        return '🔔';
      case 'BID_WON':
        return '🏆';
      case 'BID_LOST':
        return '❌';
      case 'LOAN_EXPIRED':
        return '⏰';
      case 'NEW_LOAN':
        return '💰';
      case 'LOAN_STATUS_CHANGE':
        return '🔄';
      case 'LOAN_ASSIGNMENT':
        return '📋';
      default:
        return '📋';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-500 relative"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
        >
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  disabled={isLoading}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {isLoading ? 'Clearing...' : 'Clear all'}
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {notification.message}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell; 