import { z } from 'zod';

/**
 * Shared types for MCP Notifications SSE Server
 */

// Action types for notifications (provider-agnostic)
export interface NotificationAction {
  action: 'view' | 'http';
  label: string;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  clear?: boolean;
}

// Base webhook configuration interface
export interface WebhookConfig {
  id?: string;
  url: string;
  type: string;
  name?: string;
  // Provider configuration 
  token?: string;
  defaultPriority?: number;
  templates?: {
    title?: string;
    message?: string;
  };
  defaultActions?: NotificationAction[];
  // Discord specific options
  username?: string;
  avatarUrl?: string;
  // Fallback configuration
  fallbackUrl?: string;
  fallbackType?: string;
}

// Configuration for image upload
export interface ImgurConfig {
  clientId?: string;
  apiUrl?: string;
}

// User configuration interface for the webapp
export interface UserConfig {
  id: string;
  userId: string;
  webhooks: WebhookConfig[];
  imgur?: ImgurConfig;
  fallbackWebhook?: WebhookConfig;
  createdAt: string;
  updatedAt: string;
}

// Supported webhook types
export enum WebhookType {
  FEISHU = 'feishu',
  DISCORD = 'discord',
  SLACK = 'slack',
  TEAMS = 'teams',
  NTFY = 'ntfy',
  GENERIC = 'generic',
  CUSTOM = 'custom'
}

// Provider-agnostic message format
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
  // SSE specific fields
  connectionId?: string;
  timestamp?: string;
  id?: string;
}

// SSE Connection interface
export interface SSEConnection {
  id: string;
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  connectedAt: string;
  lastPing?: string;
  isActive: boolean;
}

// SSE Event types
export type SSEEventType = 'notification' | 'ping' | 'error' | 'config-update' | 'connection-status';

export interface SSEEvent {
  type: SSEEventType;
  data: any;
  id?: string;
  retry?: number;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User authentication types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification history
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

// Zod schemas for validation
export const NotificationActionSchema = z.object({
  action: z.enum(['view', 'http']),
  label: z.string(),
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
  clear: z.boolean().optional(),
});

export const WebhookConfigSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  type: z.string(),
  name: z.string().optional(),
  token: z.string().optional(),
  defaultPriority: z.number().min(1).max(5).optional(),
  templates: z.object({
    title: z.string().optional(),
    message: z.string().optional(),
  }).optional(),
  defaultActions: z.array(NotificationActionSchema).optional(),
  username: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  fallbackUrl: z.string().url().optional(),
  fallbackType: z.string().optional(),
});

export const NotificationMessageSchema = z.object({
  title: z.string().optional(),
  body: z.string(),
  link: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  priority: z.number().min(1).max(5).optional(),
  attachments: z.array(z.string().url()).optional(),
  actions: z.array(NotificationActionSchema).optional(),
  template: z.string().optional(),
  templateData: z.record(z.any()).optional(),
  connectionId: z.string().optional(),
  timestamp: z.string().optional(),
  id: z.string().optional(),
});

export const SSEEventSchema = z.object({
  type: z.enum(['notification', 'ping', 'error', 'config-update', 'connection-status']),
  data: z.any(),
  id: z.string().optional(),
  retry: z.number().optional(),
});