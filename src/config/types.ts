/**
 * Configuration types for MCP Server Notifier
 */

// Base webhook configuration interface
export interface WebhookConfig {
  url: string;
  type: string;
  name?: string;
}

// Configuration for image upload
export interface ImgurConfig {
  clientId?: string;  // Anonymous uploads use no clientId
  apiUrl?: string;    // Override API URL if needed
}

// Main configuration interface
export interface Config {
  webhook: WebhookConfig;
  imgur?: ImgurConfig;
}

// Supported webhook types
export enum WebhookType {
  FEISHU = 'feishu',
  DISCORD = 'discord',
  SLACK = 'slack',
  TEAMS = 'teams',
  GENERIC = 'generic',
  CUSTOM = 'custom'
}

// Message format
export interface NotificationMessage {
  title?: string;
  body: string;
  link?: string;
  imageUrl?: string;
}
