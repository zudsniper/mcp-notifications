// Local type definitions for the web app
// These mirror the shared package types to avoid workspace dependency issues

export interface NotificationAction {
  action: 'view' | 'http';
  label: string;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  clear?: boolean;
}

export interface WebhookConfig {
  id: string;
  url: string;
  type: string;
  name?: string;
  token?: string;
  defaultPriority?: number;
  templates?: {
    title?: string;
    message?: string;
  };
  defaultActions?: NotificationAction[];
  username?: string;
  avatarUrl?: string;
  fallbackUrl?: string;
  fallbackType?: string;
}

export interface NotificationMessage {
  title?: string;
  body: string;
  link?: string;
  imageUrl?: string;
  priority?: number;
  attachments?: string[];
  actions?: NotificationAction[];
  template?: string;
  templateData?: Record<string, any>;
  connectionId?: string;
  timestamp?: string;
  id?: string;
}

export interface SSEConnection {
  id: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  connectedAt: string;
  lastPing?: string;
  isActive: boolean;
}

export type SSEEventType = 'notification' | 'ping' | 'error' | 'config-update' | 'connection-status';

export interface SSEEvent {
  type: SSEEventType;
  data: any;
  id?: string;
  retry?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationHistory {
  id: string;
  userId: string;
  connectionId?: string;
  message: NotificationMessage;
  webhookConfig: WebhookConfig;
  status: 'sent' | 'failed' | 'fallback';
  response?: string;
  error?: string;
  sentAt: string;
}

export interface UserConfig {
  id: string;
  userId: string;
  webhooks: WebhookConfig[];
  createdAt: string;
  updatedAt: string;
}