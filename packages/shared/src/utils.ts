import { SSEEvent, NotificationMessage, WebhookConfig } from './types.js';

/**
 * Utility functions for MCP Notifications
 */

// SSE Event utilities
export function createSSEEvent(type: SSEEvent['type'], data: any, id?: string, retry?: number): string {
  let event = `event: ${type}\n`;
  event += `data: ${JSON.stringify(data)}\n`;
  
  if (id) {
    event += `id: ${id}\n`;
  }
  
  if (retry) {
    event += `retry: ${retry}\n`;
  }
  
  event += '\n';
  return event;
}

export function createPingEvent(): string {
  return createSSEEvent('ping', { timestamp: new Date().toISOString() });
}

export function createNotificationEvent(notification: NotificationMessage, id?: string): string {
  return createSSEEvent('notification', notification, id);
}

export function createErrorEvent(error: string, id?: string): string {
  return createSSEEvent('error', { error, timestamp: new Date().toISOString() }, id);
}

// Connection ID generation
export function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Webhook URL validation
export function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Webhook type detection from URL
export function detectWebhookType(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    
    if (hostname.includes('discord.com') || hostname.includes('discordapp.com')) {
      return 'discord';
    }
    if (hostname.includes('slack.com')) {
      return 'slack';
    }
    if (hostname.includes('office.com') || hostname.includes('outlook.com')) {
      return 'teams';
    }
    if (hostname.includes('feishu.cn') || hostname.includes('larksuite.com')) {
      return 'feishu';
    }
    if (hostname.includes('ntfy.sh') || hostname.includes('ntfy.')) {
      return 'ntfy';
    }
    
    return 'generic';
  } catch {
    return 'generic';
  }
}

// Error handling utilities
export class McpNotificationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'McpNotificationError';
  }
}

// Rate limiting utilities
export function createRateLimitKey(connectionId: string, timeWindow: number = 60000): string {
  const window = Math.floor(Date.now() / timeWindow);
  return `rate_limit:${connectionId}:${window}`;
}

// Template processing utilities
export function processTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

// Configuration validation
export function validateWebhookConfig(config: WebhookConfig): string[] {
  const errors: string[] = [];
  
  if (!config.url) {
    errors.push('Webhook URL is required');
  } else if (!isValidWebhookUrl(config.url)) {
    errors.push('Invalid webhook URL format');
  }
  
  if (!config.type) {
    errors.push('Webhook type is required');
  }
  
  if (config.fallbackUrl && !isValidWebhookUrl(config.fallbackUrl)) {
    errors.push('Invalid fallback webhook URL format');
  }
  
  if (config.defaultPriority && (config.defaultPriority < 1 || config.defaultPriority > 5)) {
    errors.push('Default priority must be between 1 and 5');
  }
  
  return errors;
}

// Notification formatting utilities
export function formatNotificationForProvider(
  message: NotificationMessage,
  config: WebhookConfig
): any {
  const { type } = config;
  
  switch (type) {
    case 'discord':
      return formatDiscordMessage(message, config);
    case 'slack':
      return formatSlackMessage(message, config);
    case 'teams':
      return formatTeamsMessage(message, config);
    case 'ntfy':
      return formatNtfyMessage(message, config);
    case 'feishu':
      return formatFeishuMessage(message, config);
    default:
      return formatGenericMessage(message, config);
  }
}

function formatDiscordMessage(message: NotificationMessage, config: WebhookConfig): any {
  const embed: any = {
    title: message.title,
    description: message.body,
    timestamp: new Date().toISOString(),
    color: getPriorityColor(message.priority),
  };
  
  if (message.imageUrl) {
    embed.image = { url: message.imageUrl };
  }
  
  if (message.link) {
    embed.url = message.link;
  }
  
  const payload: any = {
    embeds: [embed],
  };
  
  if (config.username) {
    payload.username = config.username;
  }
  
  if (config.avatarUrl) {
    payload.avatar_url = config.avatarUrl;
  }
  
  return payload;
}

function formatSlackMessage(message: NotificationMessage, config: WebhookConfig): any {
  const attachment: any = {
    title: message.title,
    text: message.body,
    color: getPriorityColor(message.priority, 'slack'),
    ts: Math.floor(Date.now() / 1000),
  };
  
  if (message.link) {
    attachment.title_link = message.link;
  }
  
  if (message.imageUrl) {
    attachment.image_url = message.imageUrl;
  }
  
  return {
    attachments: [attachment],
  };
}

function formatTeamsMessage(message: NotificationMessage, config: WebhookConfig): any {
  const card: any = {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: message.title || 'Notification',
    title: message.title,
    text: message.body,
    themeColor: getPriorityColor(message.priority, 'teams'),
  };
  
  if (message.link) {
    card.potentialAction = [
      {
        '@type': 'OpenUri',
        name: 'View',
        targets: [{ os: 'default', uri: message.link }],
      },
    ];
  }
  
  return card;
}

function formatNtfyMessage(message: NotificationMessage, config: WebhookConfig): any {
  const payload: any = {
    topic: new URL(config.url).pathname.substring(1),
    title: message.title,
    message: message.body,
    priority: message.priority || config.defaultPriority || 3,
  };
  
  if (message.actions && message.actions.length > 0) {
    payload.actions = message.actions;
  }
  
  if (message.attachments && message.attachments.length > 0) {
    payload.attach = message.attachments[0]; // ntfy supports one attachment
  }
  
  return payload;
}

function formatFeishuMessage(message: NotificationMessage, config: WebhookConfig): any {
  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: {
          tag: 'plain_text',
          content: message.title || 'Notification',
        },
        template: getPriorityColor(message.priority, 'feishu'),
      },
      elements: [
        {
          tag: 'div',
          text: {
            tag: 'plain_text',
            content: message.body,
          },
        },
      ],
    },
  };
}

function formatGenericMessage(message: NotificationMessage, config: WebhookConfig): any {
  return {
    title: message.title,
    text: message.body,
    url: message.link,
    imageUrl: message.imageUrl,
    priority: message.priority,
    timestamp: new Date().toISOString(),
  };
}

function getPriorityColor(priority?: number, provider: string = 'discord'): string | number {
  const p = priority || 3;
  
  switch (provider) {
    case 'discord':
      const discordColors = {
        1: 0x95a5a6, // gray
        2: 0x3498db, // blue
        3: 0x2ecc71, // green
        4: 0xf39c12, // orange
        5: 0xe74c3c, // red
      };
      return discordColors[p as keyof typeof discordColors] || discordColors[3];
      
    case 'slack':
      const slackColors = {
        1: '#95a5a6',
        2: '#3498db',
        3: '#2ecc71',
        4: '#f39c12',
        5: '#e74c3c',
      };
      return slackColors[p as keyof typeof slackColors] || slackColors[3];
      
    case 'teams':
      const teamsColors = {
        1: '95a5a6',
        2: '3498db',
        3: '2ecc71',
        4: 'f39c12',
        5: 'e74c3c',
      };
      return teamsColors[p as keyof typeof teamsColors] || teamsColors[3];
      
    case 'feishu':
      const feishuTemplates = {
        1: 'grey',
        2: 'blue',
        3: 'green',
        4: 'orange',
        5: 'red',
      };
      return feishuTemplates[p as keyof typeof feishuTemplates] || feishuTemplates[3];
      
    default:
      return p;
  }
}