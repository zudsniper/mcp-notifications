/**
 * Configuration types for MCP Server Notifier
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

// ntfy specific types (for backward compatibility)
export type NtfyAction = NotificationAction;

// Base webhook configuration interface
export interface WebhookConfig {
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
  username?: string; // Custom username for Discord webhook
  avatarUrl?: string; // Custom avatar URL for Discord webhook
}

// Configuration for image upload
export interface ImgurConfig {
  clientId?: string;  // Anonymous uploads use no clientId
  apiUrl?: string;    // Override API URL if needed
}

// Configuration for ask functionality
export interface AskConfig {
  enabled: boolean;
  serverUrl: string;
  port: number;
}

// Main configuration interface
export interface Config {
  webhook: WebhookConfig;
  imgur?: ImgurConfig;
  ask?: AskConfig;
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
  // Enhanced notification features (may be supported differently by each provider)
  priority?: number;  // Priority level (1-5, with 5 being highest)
  attachments?: string[];  // URLs to attach to the notification
  actions?: NotificationAction[];  // Interactive actions for the notification
  // Template support (provider implementations may use this differently)
  template?: string;  // Name of the predefined template to use
  templateData?: Record<string, any>;  // Data to be used with the template
}
