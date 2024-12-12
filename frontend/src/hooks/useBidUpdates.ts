import { useEffect, useCallback, useState, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { CompetitiveLoan } from '@/types/loans';
import { authService } from '@/services/auth';

interface BidUpdate {
  type: 'bid_update';
  loan_id: number;
  new_lowest_apr: number;
  current_bid_count: number;
  current_leader?: {
    id: number;
    user: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

interface UseBidUpdatesOptions {
  onBidUpdate?: (updatedLoan: Partial<CompetitiveLoan>) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export const useBidUpdates = ({
  onBidUpdate,
  reconnectAttempts = 5,
  reconnectInterval = 3000
}: UseBidUpdatesOptions = {}) => {
  const [isClient, setIsClient] = useState(false);
  const lastUpdateRef = useRef<{ [key: number]: number }>({});
  const UPDATE_THROTTLE = 1000; // Minimum time between updates for the same loan

  const handleMessage = useCallback((data: any) => {
    if (data.type === 'bid_update') {
      const update = data as BidUpdate;
      
      // Throttle updates for the same loan
      const now = Date.now();
      const lastUpdate = lastUpdateRef.current[update.loan_id] || 0;
      if (now - lastUpdate < UPDATE_THROTTLE) {
        return;
      }
      lastUpdateRef.current[update.loan_id] = now;

      onBidUpdate?.({
        id: update.loan_id,
        lowest_bid_apr: update.new_lowest_apr,
        current_bid_count: update.current_bid_count,
        current_leader: update.current_leader
      });
    }
  }, [onBidUpdate]);

  const { isConnected, error, send } = useWebSocket({
    url: isClient ? 'bids/' : '',
    onMessage: handleMessage,
    reconnectAttempts,
    reconnectInterval,
    pingInterval: 30000,
    pongTimeout: 45000
  });

  // Handle client-side initialization
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle subscription
  useEffect(() => {
    if (isClient && isConnected) {
      // Subscribe to bid updates
      send({ type: 'subscribe_bids' });

      return () => {
        // Unsubscribe when component unmounts or connection is lost
        if (isConnected) {
          send({ type: 'unsubscribe_bids' });
        }
      };
    }
  }, [isClient, isConnected, send]);

  return {
    isConnected: isClient && isConnected,
    error
  };
}; 