import {
  NotificationSeverity,
  NotificationType,
} from '../entities/notification.entity';

export interface NotificationItem {
  idNotification: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  link: string | null;
  data: Record<string, string> | null;
  isRead: boolean;
  isResolved: boolean;
  createdAt: Date;
  readAt: Date | null;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  unreadCount: number; // sin leer y sin resolver: lo que muestra el globo de la campana
}
