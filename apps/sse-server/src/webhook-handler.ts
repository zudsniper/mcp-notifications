import {
  formatNotificationForProvider,
  type NotificationMessage,
  type WebhookConfig,
  type NotificationHistory
} from '@mcp-notifications/shared';
import type { Env, WebhookQueueMessage } from './types.js';

export class WebhookHandler {
  private env: Env;

  constructor(env: Env) {
    this.env = env;
  }

  async processNotification(
    userId: string,
    message: NotificationMessage,
    webhookConfig: WebhookConfig,
    connectionId?: string
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      // Format message for the specific provider
      const formattedMessage = formatNotificationForProvider(message, webhookConfig);
      
      // Send webhook
      const response = await this.sendWebhook(webhookConfig, formattedMessage);
      
      if (response.ok) {
        const responseText = await response.text();
        
        // Log successful notification
        await this.logNotification(userId, connectionId, message, webhookConfig, 'sent', responseText);
        
        return { success: true, response: responseText };
      } else {
        const errorText = await response.text();
        
        // Try fallback if configured and primary failed
        if (webhookConfig.fallbackUrl && webhookConfig.fallbackType) {
          const fallbackConfig: WebhookConfig = {
            ...webhookConfig,
            url: webhookConfig.fallbackUrl,
            type: webhookConfig.fallbackType
          };
          
          return this.sendFallback(userId, connectionId, message, fallbackConfig, errorText);
        }
        
        // Log failed notification
        await this.logNotification(userId, connectionId, message, webhookConfig, 'failed', undefined, errorText);
        
        return { success: false, error: errorText };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Try fallback if configured
      if (webhookConfig.fallbackUrl && webhookConfig.fallbackType) {
        const fallbackConfig: WebhookConfig = {
          ...webhookConfig,
          url: webhookConfig.fallbackUrl,
          type: webhookConfig.fallbackType
        };
        
        return this.sendFallback(userId, connectionId, message, fallbackConfig, errorMessage);
      }
      
      // Log failed notification
      await this.logNotification(userId, connectionId, message, webhookConfig, 'failed', undefined, errorMessage);
      
      return { success: false, error: errorMessage };
    }
  }

  private async sendFallback(
    userId: string,
    connectionId: string | undefined,
    message: NotificationMessage,
    fallbackConfig: WebhookConfig,
    originalError: string
  ): Promise<{ success: boolean; response?: string; error?: string }> {
    try {
      const formattedMessage = formatNotificationForProvider(message, fallbackConfig);
      const response = await this.sendWebhook(fallbackConfig, formattedMessage);
      
      if (response.ok) {
        const responseText = await response.text();
        
        // Log fallback success
        await this.logNotification(userId, connectionId, message, fallbackConfig, 'fallback', responseText);
        
        return { success: true, response: `Fallback succeeded: ${responseText}` };
      } else {
        const fallbackError = await response.text();
        
        // Log fallback failure
        await this.logNotification(
          userId,
          connectionId,
          message,
          fallbackConfig,
          'failed',
          undefined,
          `Original: ${originalError}, Fallback: ${fallbackError}`
        );
        
        return { success: false, error: `Primary failed: ${originalError}, Fallback failed: ${fallbackError}` };
      }
    } catch (fallbackError) {
      const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
      
      // Log fallback failure
      await this.logNotification(
        userId,
        connectionId,
        message,
        fallbackConfig,
        'failed',
        undefined,
        `Original: ${originalError}, Fallback: ${fallbackErrorMessage}`
      );
      
      return { 
        success: false, 
        error: `Primary failed: ${originalError}, Fallback failed: ${fallbackErrorMessage}` 
      };
    }
  }

  private async sendWebhook(config: WebhookConfig, payload: any): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'MCP-Notifications-SSE/3.0.0'
    };

    // Add authorization header for ntfy if token is configured
    if (config.type === 'ntfy' && config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    const requestInit: RequestInit = {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    };

    return fetch(config.url, requestInit);
  }

  private async logNotification(
    userId: string,
    connectionId: string | undefined,
    message: NotificationMessage,
    webhookConfig: WebhookConfig,
    status: 'sent' | 'failed' | 'fallback',
    response?: string,
    error?: string
  ): Promise<void> {
    try {
      const historyRecord: Omit<NotificationHistory, 'id'> = {
        userId,
        connectionId,
        message,
        webhookConfig,
        status,
        response,
        error,
        sentAt: new Date().toISOString()
      };

      // Store in PocketBase via API
      const pbResponse = await fetch(`${this.env.POCKETBASE_URL}/api/collections/notification_history/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.POCKETBASE_ADMIN_TOKEN || ''}`
        },
        body: JSON.stringify({
          user_id: userId,
          connection_id: connectionId,
          message: JSON.stringify(message),
          webhook_config: JSON.stringify(webhookConfig),
          status,
          response,
          error,
          sent_at: new Date().toISOString()
        })
      });

      if (!pbResponse.ok) {
        console.error('Failed to log notification history:', await pbResponse.text());
      }
    } catch (error) {
      console.error('Error logging notification history:', error);
    }
  }
}

// Queue consumer for processing webhook notifications
export async function handleWebhookQueue(
  batch: MessageBatch<WebhookQueueMessage>,
  env: Env
): Promise<void> {
  const webhookHandler = new WebhookHandler(env);

  for (const message of batch.messages) {
    try {
      const { userId, message: notificationMessage, webhookConfig } = message.body;
      
      const result = await webhookHandler.processNotification(
        userId,
        notificationMessage,
        webhookConfig
      );

      if (result.success) {
        // Acknowledge successful processing
        message.ack();
      } else {
        // Retry on failure (up to max retries configured in wrangler.toml)
        message.retry();
      }
    } catch (error) {
      console.error('Error processing webhook queue message:', error);
      message.retry();
    }
  }
}