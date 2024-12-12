import { authService } from './auth';

type WebSocketMessageHandler = (data: any) => void;
type WebSocketErrorHandler = (error: any) => void;
type WebSocketStatusHandler = (status: boolean) => void;

interface WebSocketConfig {
  pingInterval?: number;
  pongTimeout?: number;
  reconnectAttempts?: number;
  reconnectBaseDelay?: number;
  debug?: boolean;
}

const DEFAULT_CONFIG: WebSocketConfig = {
  pingInterval: 30000,
  pongTimeout: 45000,
  reconnectAttempts: 5,
  reconnectBaseDelay: 1000,
  debug: false
};

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private keepaliveInterval: NodeJS.Timeout | null = null;
  private messageHandlers: Set<WebSocketMessageHandler> = new Set();
  private errorHandlers: Set<WebSocketErrorHandler> = new Set();
  private statusHandlers: Set<WebSocketStatusHandler> = new Set();
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;
  private reconnectAttempts: number = 0;
  private lastPingTime: number = 0;
  private lastPongTime: number = 0;
  private connectionCheckInterval: NodeJS.Timeout | null = null;
  private visibilityChangeHandler: () => void;
  private onlineStatusHandler: () => void;
  private config: WebSocketConfig;
  private connectionStartTime: number = 0;
  private messageQueue: any[] = [];
  private isAuthenticated: boolean = false;

  constructor(private wsUrl: string, config: Partial<WebSocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Bind methods
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleOnlineStatus = this.handleOnlineStatus.bind(this);
    this.handlePing = this.handlePing.bind(this);
    this.handlePong = this.handlePong.bind(this);
    this.checkConnection = this.checkConnection.bind(this);

    // Setup visibility and online status handlers
    this.visibilityChangeHandler = () => this.handleVisibilityChange();
    this.onlineStatusHandler = () => this.handleOnlineStatus();
    
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.visibilityChangeHandler);
      window.addEventListener('online', this.onlineStatusHandler);
      window.addEventListener('offline', this.onlineStatusHandler);
    }
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WebSocket]', ...args);
    }
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.log('Tab became visible, checking connection...');
      this.checkConnection();
    } else {
      this.log('Tab hidden, suspending non-essential operations');
      // Optionally reduce ping frequency when tab is hidden
      this.adjustKeepaliveInterval(true);
    }
  }

  private handleOnlineStatus(): void {
    if (navigator.onLine) {
      this.log('Network connection restored, reconnecting...');
      this.reconnect();
    } else {
      this.log('Network connection lost');
      this.cleanupConnection('network_lost');
      this.notifyStatusChange(false);
    }
  }

  private adjustKeepaliveInterval(isBackgroundMode: boolean): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.send({ type: 'ping' });
          this.lastPingTime = Date.now();
        }
      }, isBackgroundMode ? this.config.pingInterval! * 2 : this.config.pingInterval);
    }
  }

  private startKeepalive(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
    }

    // Send initial ping
    this.send({ type: 'ping' });
    this.lastPingTime = Date.now();

    // Start keepalive interval
    this.keepaliveInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
        this.lastPingTime = Date.now();
      }
    }, this.config.pingInterval);

    // Start connection check interval
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    this.connectionCheckInterval = setInterval(this.checkConnection, 5000);
  }

  private checkConnection(): void {
    if (!navigator.onLine) {
      this.log('No network connection, skipping check');
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log('Connection check failed, attempting reconnect...');
      this.reconnect();
      return;
    }

    // Check if we haven't received a pong in the configured timeout
    if (this.lastPongTime && Date.now() - this.lastPongTime > this.config.pongTimeout!) {
      this.log('No pong received in configured timeout, reconnecting...');
      this.reconnect();
    }

    // Check connection duration
    const connectionDuration = Date.now() - this.connectionStartTime;
    if (connectionDuration > 4 * 60 * 60 * 1000) { // 4 hours
      this.log('Connection duration exceeded 4 hours, refreshing connection...');
      this.reconnect();
    }
  }

  private handlePing(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'pong' });
    }
  }

  private handlePong(): void {
    this.lastPongTime = Date.now();
  }

  private cleanupConnection(reason: string = 'cleanup'): void {
    if (this.ws) {
      try {
        this.ws.close(1000, reason);
      } catch (error) {
        this.log('Error closing WebSocket:', error);
      }
      this.ws = null;
    }

    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }

    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isAuthenticated = false;
  }

  private reconnect(): void {
    if (!navigator.onLine) {
      this.log('No network connection, skipping reconnect');
      return;
    }

    this.log('Initiating reconnection...');
    this.cleanupConnection('reconnecting');

    if (this.reconnectAttempts < this.config.reconnectAttempts!) {
      const delay = Math.min(
        this.config.reconnectBaseDelay! * Math.pow(2, this.reconnectAttempts),
        30000 // Max 30 second delay
      );

      this.reconnectTimeout = setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay);
    } else {
      this.log('Max reconnection attempts reached');
      this.shouldReconnect = false;
      this.notifyError(new Error('Maximum reconnection attempts reached'));
      this.notifyStatusChange(false);
    }
  }

  public connect(): void {
    if (this.isConnecting) {
      this.log('Connection attempt already in progress');
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.log('WebSocket already connected');
      return;
    }

    if (!navigator.onLine) {
      this.log('No network connection, skipping connect');
      return;
    }

    this.isConnecting = true;
    const token = authService.getToken();

    if (!token) {
      this.log('No authentication token available');
      this.isConnecting = false;
      return;
    }

    try {
      this.log('Connecting to WebSocket:', this.wsUrl);
      this.ws = new WebSocket(this.wsUrl);
      this.connectionStartTime = Date.now();

      this.ws.onopen = () => {
        this.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.lastPingTime = Date.now();
        this.lastPongTime = Date.now();
        this.notifyStatusChange(true);
        
        // Send authentication message
        this.send({
          type: 'authenticate',
          token: token
        });

        // Process queued messages
        while (this.messageQueue.length > 0) {
          const message = this.messageQueue.shift();
          this.send(message);
        }

        // Start keepalive
        this.startKeepalive();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle authentication response
          if (data.type === 'authentication_successful') {
            this.isAuthenticated = true;
            return;
          }

          if (data.type === 'authentication_failed') {
            this.isAuthenticated = false;
            this.notifyError(new Error('Authentication failed'));
            this.disconnect();
            return;
          }

          // Handle ping/pong
          if (data.type === 'ping') {
            this.handlePing();
            return;
          }
          if (data.type === 'pong') {
            this.handlePong();
            return;
          }

          // Notify handlers
          this.messageHandlers.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              this.log('Error in message handler:', error);
            }
          });
        } catch (error) {
          this.log('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        this.log('WebSocket closed with code:', event.code);
        this.isConnecting = false;
        this.notifyStatusChange(false);
        
        // Don't reconnect on normal closure or if shouldReconnect is false
        if (event.code === 1000 || event.code === 1001 || !this.shouldReconnect) {
          return;
        }

        this.reconnect();
      };

      this.ws.onerror = (event) => {
        this.log('WebSocket error:', event);
        this.notifyError(event);
        this.isConnecting = false;
        this.notifyStatusChange(false);
      };
    } catch (error) {
      this.log('Failed to establish WebSocket connection:', error);
      this.isConnecting = false;
      this.notifyError(error);
      this.notifyStatusChange(false);
    }
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    this.cleanupConnection('user_disconnect');
    this.notifyStatusChange(false);
  }

  public send(data: any): void {
    if (!this.isAuthenticated && data.type !== 'authenticate' && data.type !== 'ping') {
      this.messageQueue.push(data);
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (error) {
        this.log('Error sending WebSocket message:', error);
        this.notifyError(error);
      }
    } else if (data.type !== 'ping') {
      this.messageQueue.push(data);
    }
  }

  public addMessageHandler(handler: WebSocketMessageHandler): void {
    this.messageHandlers.add(handler);
  }

  public removeMessageHandler(handler: WebSocketMessageHandler): void {
    this.messageHandlers.delete(handler);
  }

  public addErrorHandler(handler: WebSocketErrorHandler): void {
    this.errorHandlers.add(handler);
  }

  public removeErrorHandler(handler: WebSocketErrorHandler): void {
    this.errorHandlers.delete(handler);
  }

  public addStatusHandler(handler: WebSocketStatusHandler): void {
    this.statusHandlers.add(handler);
  }

  public removeStatusHandler(handler: WebSocketStatusHandler): void {
    this.statusHandlers.delete(handler);
  }

  private notifyError(error: any): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        this.log('Error in error handler:', err);
      }
    });
  }

  private notifyStatusChange(isConnected: boolean): void {
    this.statusHandlers.forEach(handler => {
      try {
        handler(isConnected);
      } catch (err) {
        this.log('Error in status handler:', err);
      }
    });
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN && this.isAuthenticated;
  }

  public cleanup(): void {
    this.shouldReconnect = false;
    this.cleanupConnection('cleanup');

    if (typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
      window.removeEventListener('online', this.onlineStatusHandler);
      window.removeEventListener('offline', this.onlineStatusHandler);
    }
  }
}

// Create singleton instance with default configuration
export const notificationWebSocket = new WebSocketService(
  `${process.env.NEXT_PUBLIC_WS_URL}/ws/notifications/`,
  {
    debug: process.env.NODE_ENV === 'development',
    pingInterval: 30000,
    pongTimeout: 45000,
    reconnectAttempts: 5,
    reconnectBaseDelay: 1000
  }
); 