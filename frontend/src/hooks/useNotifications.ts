import { useState, useEffect, useCallback, useRef } from 'react';
import { notificationWebSocket } from '@/services/websocket';
import { authService } from '@/services/auth';
import { debounce } from 'lodash';

interface Notification {
  id: number;
  type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const CACHE_DURATION = 1 * 60 * 1000; // 1 minute
const FETCH_THROTTLE = 1000; // 1 second between fetches

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const lastFetchRef = useRef<number>(0);
  const isMountedRef = useRef(true);
  const wsReconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Throttled fetch function
  const throttledFetch = useCallback(
    debounce(async (useCached = true) => {
      if (!isMountedRef.current) return;

      const now = Date.now();
      if (now - lastFetchRef.current < FETCH_THROTTLE) {
        return;
      }
      lastFetchRef.current = now;

      try {
        // Check cache first if allowed
        if (useCached) {
          const cachedData = localStorage.getItem('notifications');
          const cachedTimestamp = localStorage.getItem('notificationsTimestamp');
          
          if (cachedData && cachedTimestamp) {
            const timestamp = parseInt(cachedTimestamp);
            if (now - timestamp < CACHE_DURATION) {
              const parsedData = JSON.parse(cachedData);
              if (isMountedRef.current) {
                setNotifications(parsedData.notifications);
                setUnreadCount(parsedData.unreadCount);
                setIsLoading(false);
                setError(null);
              }
              return;
            }
          }
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/notifications/`,
          {
            headers: {
              'Authorization': `Bearer ${authService.getToken()}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch notifications');
        }

        const data = await response.json();
        if (isMountedRef.current) {
          setNotifications(data.notifications);
          setUnreadCount(data.notifications.filter((n: Notification) => !n.is_read).length);
          setError(null);
          
          // Update cache
          localStorage.setItem('notifications', JSON.stringify({
            notifications: data.notifications,
            unreadCount: data.notifications.filter((n: Notification) => !n.is_read).length
          }));
          localStorage.setItem('notificationsTimestamp', now.toString());
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
        if (isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }, FETCH_THROTTLE, { leading: true, trailing: false }),
    []
  );

  // Handle WebSocket messages
  const handleNotificationMessage = useCallback((data: any) => {
    if (!isMountedRef.current) return;

    if (data.type === 'notification') {
      setNotifications(prev => {
        // Check if notification already exists
        const exists = prev.some(n => n.id === data.notification.id);
        if (exists) return prev;
        return [data.notification, ...prev];
      });
      if (!data.notification.is_read) {
        setUnreadCount(prev => prev + 1);
      }

      // Update cache
      const cachedData = localStorage.getItem('notifications');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        parsed.notifications = [data.notification, ...parsed.notifications];
        parsed.unreadCount = parsed.unreadCount + (data.notification.is_read ? 0 : 1);
        localStorage.setItem('notifications', JSON.stringify(parsed));
        localStorage.setItem('notificationsTimestamp', Date.now().toString());
      }
    }
  }, []);

  // Handle WebSocket errors
  const handleWebSocketError = useCallback((error: any) => {
    if (!isMountedRef.current) return;
    console.error('WebSocket error:', error);
    setError('WebSocket connection error');
    setIsWsConnected(false);

    // Attempt to reconnect
    if (wsReconnectTimeoutRef.current) {
      clearTimeout(wsReconnectTimeoutRef.current);
    }
    wsReconnectTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        notificationWebSocket.connect();
      }
    }, 5000);
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    isMountedRef.current = true;
    
    // Add message and error handlers
    notificationWebSocket.addMessageHandler(handleNotificationMessage);
    notificationWebSocket.addErrorHandler(handleWebSocketError);

    // Add status handler
    const handleStatus = (status: boolean) => {
      if (isMountedRef.current) {
        setIsWsConnected(status);
        if (status) {
          setError(null);
        }
      }
    };
    notificationWebSocket.addStatusHandler(handleStatus);

    // Initial fetch
    throttledFetch();

    return () => {
      isMountedRef.current = false;
      notificationWebSocket.removeMessageHandler(handleNotificationMessage);
      notificationWebSocket.removeErrorHandler(handleWebSocketError);
      notificationWebSocket.removeStatusHandler(handleStatus);
      if (wsReconnectTimeoutRef.current) {
        clearTimeout(wsReconnectTimeoutRef.current);
      }
    };
  }, [handleNotificationMessage, handleWebSocketError, throttledFetch]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    if (!isMountedRef.current) return;

    // Optimistic update
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      // Send update through WebSocket
      notificationWebSocket.send({
        type: 'mark_read',
        notification_id: notificationId
      });

      // Update cache
      const cachedData = localStorage.getItem('notifications');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        parsed.notifications = parsed.notifications.map((n: Notification) =>
          n.id === notificationId ? { ...n, is_read: true } : n
        );
        parsed.unreadCount = Math.max(0, parsed.unreadCount - 1);
        localStorage.setItem('notifications', JSON.stringify(parsed));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      // Revert optimistic update on error
      if (isMountedRef.current) {
        throttledFetch(false);
      }
    }
  }, [throttledFetch]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Optimistic update
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true }))
    );
    setUnreadCount(0);

    try {
      // Send update through WebSocket
      notificationWebSocket.send({
        type: 'mark_all_read'
      });

      // Update cache
      const cachedData = localStorage.getItem('notifications');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        parsed.notifications = parsed.notifications.map((n: Notification) => ({
          ...n,
          is_read: true
        }));
        parsed.unreadCount = 0;
        localStorage.setItem('notifications', JSON.stringify(parsed));
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      // Revert optimistic update on error
      if (isMountedRef.current) {
        throttledFetch(false);
      }
    }
  }, [throttledFetch]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    isWsConnected,
    markAsRead,
    markAllAsRead,
    refreshNotifications: () => throttledFetch(false)
  };
}; 