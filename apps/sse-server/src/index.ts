import { SSEConnectionManager } from './connection-manager.js';
import { WebhookHandler, handleWebhookQueue } from './webhook-handler.js';
import type { Env, NotificationRequest, ApiError } from './types.js';
import {
  NotificationMessageSchema,
  WebhookConfigSchema,
  createRateLimitKey,
  type NotificationMessage,
  type WebhookConfig
} from '@mcp-notifications/shared';

export { SSEConnectionManager };

// Main Worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCORS(env);
    }

    try {
      // Route requests
      if (pathname.startsWith('/sse/')) {
        return handleSSERoutes(request, env, pathname);
      } else if (pathname.startsWith('/api/')) {
        return handleAPIRoutes(request, env, pathname);
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Worker error:', error);
      return createErrorResponse('INTERNAL_ERROR', 'Internal server error', 500);
    }
  },

  async queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
    return handleWebhookQueue(batch, env);
  }
};

async function handleSSERoutes(request: Request, env: Env, pathname: string): Promise<Response> {
  // Get the Durable Object instance
  const id = env.SSE_CONNECTIONS.idFromName('default');
  const obj = env.SSE_CONNECTIONS.get(id);

  // Forward request to Durable Object
  const newUrl = new URL(request.url);
  newUrl.pathname = pathname.replace('/sse', '');
  
  const modifiedRequest = new Request(newUrl.toString(), {
    method: request.method,
    headers: request.headers,
    body: request.body
  });

  return obj.fetch(modifiedRequest);
}

async function handleAPIRoutes(request: Request, env: Env, pathname: string): Promise<Response> {
  const path = pathname.replace('/api', '');

  switch (path) {
    case '/notify':
      return handleNotifyAPI(request, env);
    case '/health':
      return handleHealthCheck(request, env);
    default:
      return new Response('API endpoint not found', { status: 404 });
  }
}

async function handleNotifyAPI(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return createErrorResponse('METHOD_NOT_ALLOWED', 'Method not allowed', 405);
  }

  try {
    const body = await request.json() as NotificationRequest;
    
    // Validate the notification message
    const validationResult = NotificationMessageSchema.safeParse(body.message);
    if (!validationResult.success) {
      return createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid notification message',
        400,
        validationResult.error.errors
      );
    }

    const { connectionId, userId, message, webhookConfig } = body;

    if (!userId) {
      return createErrorResponse('MISSING_USER_ID', 'User ID is required', 400);
    }

    // Rate limiting
    const rateLimitKey = createRateLimitKey(connectionId || userId);
    const rateLimitCount = await env.RATE_LIMIT_KV.get(rateLimitKey);
    
    if (rateLimitCount && parseInt(rateLimitCount) > 100) { // 100 requests per minute
      return createErrorResponse('RATE_LIMITED', 'Rate limit exceeded', 429);
    }

    // Increment rate limit counter
    await env.RATE_LIMIT_KV.put(rateLimitKey, String((parseInt(rateLimitCount || '0') + 1)), { expirationTtl: 60 });

    // If webhook config is provided, process notification immediately
    if (webhookConfig) {
      const webhookValidation = WebhookConfigSchema.safeParse(webhookConfig);
      if (!webhookValidation.success) {
        return createErrorResponse(
          'VALIDATION_ERROR',
          'Invalid webhook configuration',
          400,
          webhookValidation.error.errors
        );
      }

      const webhookHandler = new WebhookHandler(env);
      const result = await webhookHandler.processNotification(userId, message, webhookConfig, connectionId);

      if (!result.success) {
        return createErrorResponse('WEBHOOK_FAILED', result.error || 'Webhook delivery failed', 500);
      }
    }

    // Send to SSE connections
    const sseResult = await notifySSEConnections(env, { connectionId, userId, message });

    return new Response(JSON.stringify({
      success: true,
      message: 'Notification processed',
      data: {
        sseDelivered: sseResult.success,
        webhookDelivered: !!webhookConfig
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*'
      }
    });

  } catch (error) {
    console.error('Error in notify API:', error);
    return createErrorResponse('INTERNAL_ERROR', 'Failed to process notification', 500);
  }
}

async function notifySSEConnections(
  env: Env,
  request: { connectionId?: string; userId: string; message: NotificationMessage }
): Promise<{ success: boolean; error?: string }> {
  try {
    const id = env.SSE_CONNECTIONS.idFromName('default');
    const obj = env.SSE_CONNECTIONS.get(id);

    const response = await obj.fetch('https://dummy.local/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorText = await response.text();
      return { success: false, error: errorText };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

async function handleHealthCheck(request: Request, env: Env): Promise<Response> {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    environment: env.ENVIRONMENT || 'unknown'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function handleCORS(env: Env): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
}

function createErrorResponse(code: string, message: string, status: number, details?: any): Response {
  const error: ApiError = { code, message, details };
  
  return new Response(JSON.stringify({
    success: false,
    error
  }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}