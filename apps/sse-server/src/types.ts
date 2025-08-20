import type {
  SSEConnection,
  NotificationMessage,
  WebhookConfig,
  User,
  SSEEvent
} from '@mcp-notifications/shared';

export interface Env {
  // Durable Objects
  SSE_CONNECTIONS: DurableObjectNamespace;
  
  // KV Namespaces
  RATE_LIMIT_KV: KVNamespace;
  
  // Queues
  WEBHOOK_QUEUE: Queue;
  
  // Environment Variables
  POCKETBASE_URL: string;
  CORS_ORIGIN: string;
  ENVIRONMENT: string;
  
  // Secrets (set via wrangler secret)
  POCKETBASE_ADMIN_TOKEN?: string;
  JWT_SECRET?: string;
}

export interface ConnectionManagerState {
  connections: Map<string, SSEConnection>;
  lastCleanup: number;
}

export interface NotificationRequest {
  connectionId?: string;
  userId: string;
  message: NotificationMessage;
  webhookConfig?: WebhookConfig;
}

export interface WebhookQueueMessage {
  id: string;
  userId: string;
  message: NotificationMessage;
  webhookConfig: WebhookConfig;
  attempt: number;
  timestamp: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}