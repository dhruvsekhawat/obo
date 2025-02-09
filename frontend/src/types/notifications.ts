export interface Notification {
  id: number;
  type: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unread_count: number;
} 