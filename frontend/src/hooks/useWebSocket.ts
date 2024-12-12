import { useEffect, useRef, useState, useCallback } from 'react';
import { authService } from '@/services/auth';
import { debounce } from 'lodash';

interface WebSocketHookOptions {
  url: string;
  onMessage?: (data: any) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  pingInterval?: number;
  pongTimeout?: number;
}

export const useWebSocket = ({
  url,
  onMessage,
  reconnectAttempts = 5,
  reconnectInterval = 3000,
  pingInterval = 30000,
  pongTimeout = 45000,
}: WebSocketHookOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const lastConnectAttemptRef = useRef<number>(0);
  const isUnmountingRef = useRef(false);
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const lastPongRef = useRef<number>(Date.now());
  const connectionStartTimeRef = useRef<number>(0);
  const messageQueueRef = useRef<any[]>([]);
  const isAuthenticatedRef = useRef(false);

  // Debounced reconnect function to prevent rapid reconnection attempts
  const debouncedReconnect = useCallback(
    debounce(() => {
      if (isUnmountingRef.current || !navigator.onLine) return;

      const now = Date.now();
      if (now - lastConnectAttemptRef.current < 1000) return;

      if (reconnectCountRef.current < reconnectAttempts) {
        const delay = Math.min(
          reconnectInterval * Math.pow(1.5, reconnectCountRef.current),
          30000
        );
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isUnmountingRef.current) {
            reconnectCountRef.current += 1;
            connect();
          }
        }, delay);
      } else {
        setError('Maximum reconnection attempts reached');
      }
    }, 1000, { leading: true, trailing: false }),
    [reconnectAttempts, reconnectInterval]
  );

  // Connection health check
  const checkConnection = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const now = Date.now();
    if (now - lastPongRef.current > pongTimeout) {
      console.log('Connection health check failed - No pong received');
      wsRef.current.close(4000, 'Health check failed');
      return;
    }

    const connectionDuration = now - connectionStartTimeRef.current;
    if (connectionDuration > 4 * 60 * 60 * 1000) { // 4 hours
      console.log('Connection duration exceeded 4 hours, refreshing');
      wsRef.current.close(4000, 'Connection refresh');
    }
  }, [pongTimeout]);

  // Clean up resources
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'Cleanup');
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    isAuthenticatedRef.current = false;
    setIsConnected(false);
  }, []);

  // Process message queue
  const processMessageQueue = useCallback(() => {
    while (messageQueueRef.current.length > 0 && isAuthenticatedRef.current) {
      const message = messageQueueRef.current.shift();
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      }
    }
  }, []);

  // Connect function
  const connect = useCallback(() => {
    if (!url || isUnmountingRef.current || typeof window === 'undefined') return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const token = authService.getToken();
    if (!token) {
      setError('No authentication token available');
      return;
    }

    try {
      cleanup();
      
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001';
      const fullUrl = `${wsUrl}/ws/${url}`.replace(/\/+/g, '/').replace(':/', '://');
      
      wsRef.current = new WebSocket(fullUrl);
      connectionStartTimeRef.current = Date.now();
      lastConnectAttemptRef.current = Date.now();

      wsRef.current.onopen = () => {
        if (isUnmountingRef.current) {
          wsRef.current?.close(1000, 'Component unmounting');
          return;
        }

        console.log('WebSocket connected to:', fullUrl);
        setIsConnected(true);
        setError(null);
        reconnectCountRef.current = 0;
        
        // Send authentication
        wsRef.current?.send(JSON.stringify({
          type: 'authenticate',
          token: token
        }));

        // Start ping interval
        pingIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, pingInterval);
      };

      wsRef.current.onmessage = (event) => {
        if (isUnmountingRef.current) return;
        try {
          const data = JSON.parse(event.data);
          
          // Handle authentication response
          if (data.type === 'authentication_successful') {
            isAuthenticatedRef.current = true;
            processMessageQueue();
            return;
          }

          if (data.type === 'authentication_failed') {
            isAuthenticatedRef.current = false;
            setError('Authentication failed');
            cleanup();
            return;
          }

          // Handle ping/pong
          if (data.type === 'pong') {
            lastPongRef.current = Date.now();
            return;
          }

          onMessage?.(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed with code:', event.code);
        setIsConnected(false);
        isAuthenticatedRef.current = false;

        if (!isUnmountingRef.current && event.code !== 1000 && event.code !== 1001) {
          debouncedReconnect();
        }
      };

      wsRef.current.onerror = (event) => {
        if (isUnmountingRef.current) return;
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };
    } catch (err) {
      if (!isUnmountingRef.current) {
        console.error('Failed to establish WebSocket connection:', err);
        setError('Failed to establish WebSocket connection');
      }
    }
  }, [url, onMessage, pingInterval, cleanup, debouncedReconnect, processMessageQueue]);

  // Initialize connection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    isUnmountingRef.current = false;
    connect();

    // Setup visibility change handler
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkConnection();
      }
    };

    // Setup online/offline handlers
    const handleOnline = () => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        connect();
      }
    };

    const handleOffline = () => {
      cleanup();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isUnmountingRef.current = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanup();
    };
  }, [connect, cleanup, checkConnection]);

  // Send message function
  const send = useCallback((data: any) => {
    if (!isAuthenticatedRef.current && data.type !== 'authenticate' && data.type !== 'ping') {
      messageQueueRef.current.push(data);
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      messageQueueRef.current.push(data);
    }
  }, []);

  return {
    isConnected: isConnected && isAuthenticatedRef.current,
    error,
    send
  };
}; 