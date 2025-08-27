import PocketBase from 'pocketbase';
import type {
  User,
  WebhookConfig,
  SSEConnection,
  NotificationHistory,
  UserConfig
} from '@mcp-notifications/shared';

// PocketBase client
export const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://localhost:8090');

// Type definitions for PocketBase records
export interface PBWebhookConfig {
  id: string;
  user_id: string;
  name?: string;
  url: string;
  type: string;
  token?: string;
  default_priority?: number;
  templates?: Record<string, any>;
  default_actions?: Record<string, any>[];
  username?: string;
  avatar_url?: string;
  fallback_url?: string;
  fallback_type?: string;
  is_active: boolean;
  created: string;
  updated: string;
}

export interface PBSSEConnection {
  id: string;
  user_id: string;
  connection_id: string;
  user_agent?: string;
  ip_address?: string;
  connected_at: string;
  last_ping?: string;
  is_active: boolean;
  created: string;
  updated: string;
}

export interface PBNotificationHistory {
  id: string;
  user_id: string;
  connection_id?: string;
  message: string; // JSON string
  webhook_config: string; // JSON string
  status: 'sent' | 'failed' | 'fallback';
  response?: string;
  error?: string;
  sent_at: string;
  created: string;
  updated: string;
}

export interface PBNotificationTemplate {
  id: string;
  user_id: string;
  name: string;
  title_template?: string;
  body_template: string;
  default_data?: Record<string, any>;
  is_system: boolean;
  created: string;
  updated: string;
}

// Authentication helpers
export const auth = {
  async signUp(email: string, password: string, name?: string) {
    return await pb.collection('users').create({
      email,
      password,
      passwordConfirm: password,
      name,
    });
  },

  async signIn(email: string, password: string) {
    return await pb.collection('users').authWithPassword(email, password);
  },

  async signOut() {
    pb.authStore.clear();
  },

  async refresh() {
    if (pb.authStore.isValid) {
      try {
        await pb.collection('users').authRefresh();
      } catch (error) {
        console.error('Failed to refresh auth:', error);
        pb.authStore.clear();
      }
    }
  },

  getCurrentUser(): User | null {
    if (!pb.authStore.isValid || !pb.authStore.model) {
      return null;
    }

    const model = pb.authStore.model;
    return {
      id: model.id,
      email: model.email,
      name: model.name,
      avatar: model.avatar ? pb.files.getUrl(model, model.avatar) : undefined,
      createdAt: model.created,
      updatedAt: model.updated,
    };
  },

  isAuthenticated(): boolean {
    return pb.authStore.isValid;
  }
};

// Webhook configuration helpers
export const webhooks = {
  async list(): Promise<WebhookConfig[]> {
    const records = await pb.collection('webhook_configs').getFullList<PBWebhookConfig>({
      sort: 'created',
    });

    return records.map(transformWebhookConfig);
  },

  async get(id: string): Promise<WebhookConfig | null> {
    try {
      const record = await pb.collection('webhook_configs').getOne<PBWebhookConfig>(id);
      return transformWebhookConfig(record);
    } catch (error) {
      return null;
    }
  },

  async create(config: Omit<WebhookConfig, 'id'>): Promise<WebhookConfig> {
    const record = await pb.collection('webhook_configs').create<PBWebhookConfig>({
      user_id: pb.authStore.model?.id,
      name: config.name,
      url: config.url,
      type: config.type,
      token: config.token,
      default_priority: config.defaultPriority,
      templates: config.templates,
      default_actions: config.defaultActions,
      username: config.username,
      avatar_url: config.avatarUrl,
      fallback_url: config.fallbackUrl,
      fallback_type: config.fallbackType,
      is_active: true,
    });

    return transformWebhookConfig(record);
  },

  async update(id: string, config: Partial<WebhookConfig>): Promise<WebhookConfig> {
    const record = await pb.collection('webhook_configs').update<PBWebhookConfig>(id, {
      name: config.name,
      url: config.url,
      type: config.type,
      token: config.token,
      default_priority: config.defaultPriority,
      templates: config.templates,
      default_actions: config.defaultActions,
      username: config.username,
      avatar_url: config.avatarUrl,
      fallback_url: config.fallbackUrl,
      fallback_type: config.fallbackType,
    });

    return transformWebhookConfig(record);
  },

  async delete(id: string): Promise<void> {
    await pb.collection('webhook_configs').delete(id);
  },

  async toggle(id: string, isActive: boolean): Promise<WebhookConfig> {
    const record = await pb.collection('webhook_configs').update<PBWebhookConfig>(id, {
      is_active: isActive,
    });

    return transformWebhookConfig(record);
  }
};

// SSE connection helpers
export const connections = {
  async list(): Promise<SSEConnection[]> {
    const records = await pb.collection('sse_connections').getFullList<PBSSEConnection>({
      sort: '-connected_at',
      filter: 'is_active = true',
    });

    return records.map(transformSSEConnection);
  },

  async create(connectionId: string, userAgent?: string, ipAddress?: string): Promise<SSEConnection> {
    const record = await pb.collection('sse_connections').create<PBSSEConnection>({
      user_id: pb.authStore.model?.id,
      connection_id: connectionId,
      user_agent: userAgent,
      ip_address: ipAddress,
      connected_at: new Date().toISOString(),
      is_active: true,
    });

    return transformSSEConnection(record);
  },

  async updatePing(connectionId: string): Promise<void> {
    try {
      const records = await pb.collection('sse_connections').getFullList<PBSSEConnection>({
        filter: `connection_id = "${connectionId}"`,
      });

      if (records.length > 0) {
        await pb.collection('sse_connections').update(records[0].id, {
          last_ping: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to update ping:', error);
    }
  },

  async disconnect(connectionId: string): Promise<void> {
    try {
      const records = await pb.collection('sse_connections').getFullList<PBSSEConnection>({
        filter: `connection_id = "${connectionId}"`,
      });

      if (records.length > 0) {
        await pb.collection('sse_connections').update(records[0].id, {
          is_active: false,
        });
      }
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  }
};

// Notification history helpers
export const history = {
  async list(page = 1, perPage = 50): Promise<{ items: NotificationHistory[]; totalPages: number; totalItems: number }> {
    const result = await pb.collection('notification_history').getList<PBNotificationHistory>(page, perPage, {
      sort: '-sent_at',
    });

    return {
      items: result.items.map(transformNotificationHistory),
      totalPages: result.totalPages,
      totalItems: result.totalItems,
    };
  },

  async get(id: string): Promise<NotificationHistory | null> {
    try {
      const record = await pb.collection('notification_history').getOne<PBNotificationHistory>(id);
      return transformNotificationHistory(record);
    } catch (error) {
      return null;
    }
  }
};

// Template helpers
export const templates = {
  async list(): Promise<PBNotificationTemplate[]> {
    return await pb.collection('notification_templates').getFullList<PBNotificationTemplate>({
      sort: 'name',
    });
  },

  async create(template: Omit<PBNotificationTemplate, 'id' | 'user_id' | 'created' | 'updated' | 'is_system'>): Promise<PBNotificationTemplate> {
    return await pb.collection('notification_templates').create<PBNotificationTemplate>({
      user_id: pb.authStore.model?.id,
      ...template,
      is_system: false,
    });
  }
};

// Transform functions
function transformWebhookConfig(record: PBWebhookConfig): WebhookConfig {
  return {
    id: record.id,
    url: record.url,
    type: record.type,
    name: record.name,
    token: record.token,
    defaultPriority: record.default_priority,
    templates: record.templates,
    defaultActions: record.default_actions,
    username: record.username,
    avatarUrl: record.avatar_url,
    fallbackUrl: record.fallback_url,
    fallbackType: record.fallback_type,
  };
}

function transformSSEConnection(record: PBSSEConnection): SSEConnection {
  return {
    id: record.connection_id,
    userId: record.user_id,
    userAgent: record.user_agent,
    ipAddress: record.ip_address,
    connectedAt: record.connected_at,
    lastPing: record.last_ping,
    isActive: record.is_active,
  };
}

function transformNotificationHistory(record: PBNotificationHistory): NotificationHistory {
  return {
    id: record.id,
    userId: record.user_id,
    connectionId: record.connection_id,
    message: JSON.parse(record.message),
    webhookConfig: JSON.parse(record.webhook_config),
    status: record.status,
    response: record.response,
    error: record.error,
    sentAt: record.sent_at,
  };
}