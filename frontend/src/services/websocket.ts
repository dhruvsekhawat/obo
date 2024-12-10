import { authService } from './auth';

type WebSocketMessageHandler = (data: any) => void;
type WebSocketErrorHandler = (error: any) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private messageHandlers: Set<WebSocketMessageHandler> = new Set();
  private errorHandlers: Set<WebSocketErrorHandler> = new Set();
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;

  constructor(private wsUrl: string) {}

  public connect(): void {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;
    const token = authService.getToken();

    if (!token) {
      console.error('No authentication token available');
      this.isConnecting = false;
      return;
    }

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        
        // Send authentication message immediately after connection
        this.ws?.send(JSON.stringify({
          type: 'authenticate',
          token: token
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandlers.forEach(handler => handler(data));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.errorHandlers.forEach(handler => handler(error));
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;

        if (this.shouldReconnect && event.code !== 1000 && event.code !== 1001) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      this.isConnecting = false;
    }
  }

  public disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
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

  public send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  private scheduleReconnect(): void {
    if (!this.reconnectTimeout && this.shouldReconnect) {
      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect();
      }, 3000);
    }
  }
}

// Create a singleton instance for the notification WebSocket
const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL}/api/ws/notifications/`;
export const notificationWebSocket = new WebSocketService(wsUrl); 