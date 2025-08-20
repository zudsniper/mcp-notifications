import {
  generateConnectionId,
  createSSEEvent,
  createPingEvent,
  createNotificationEvent,
  createErrorEvent,
  type SSEConnection,
  type NotificationMessage
} from '@mcp-notifications/shared';
import type { Env, ConnectionManagerState } from './types.js';

export class SSEConnectionManager implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private connections: Map<string, { connection: SSEConnection; controller: ReadableStreamDefaultController }> = new Map();
  private cleanupInterval?: number;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    
    // Setup periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleConnections();
    }, 30000); // Every 30 seconds
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    try {
      switch (pathname) {
        case '/connect':
          return this.handleConnect(request);
        case '/notify':
          return this.handleNotify(request);
        case '/disconnect':
          return this.handleDisconnect(request);
        case '/status':
          return this.handleStatus(request);
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('SSEConnectionManager error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  private async handleConnect(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const userAgent = request.headers.get('User-Agent') || undefined;
    const ipAddress = request.headers.get('CF-Connecting-IP') || 
                     request.headers.get('X-Forwarded-For') ||
                     undefined;

    if (!userId) {
      return new Response('Missing userId parameter', { status: 400 });
    }

    const connectionId = generateConnectionId();
    const connection: SSEConnection = {
      id: connectionId,
      userId,
      userAgent,
      ipAddress,
      connectedAt: new Date().toISOString(),
      lastPing: new Date().toISOString(),
      isActive: true
    };

    // Create SSE stream
    let controller: ReadableStreamDefaultController;
    const stream = new ReadableStream({
      start(ctrl) {
        controller = ctrl;
        
        // Send initial connection event
        const connectEvent = createSSEEvent('connection-status', {
          connectionId,
          status: 'connected',
          timestamp: new Date().toISOString()
        }, connectionId);
        
        ctrl.enqueue(new TextEncoder().encode(connectEvent));
        
        // Send initial ping
        const pingEvent = createPingEvent();
        ctrl.enqueue(new TextEncoder().encode(pingEvent));
      }
    });

    // Store connection
    this.connections.set(connectionId, { connection, controller: controller! });

    // Store in durable object state
    await this.state.storage.put(`connection:${connectionId}`, connection);

    // Setup ping interval for this connection
    const pingInterval = setInterval(() => {
      const connData = this.connections.get(connectionId);
      if (connData) {
        try {
          const pingEvent = createPingEvent();
          connData.controller.enqueue(new TextEncoder().encode(pingEvent));
          
          // Update last ping time
          connData.connection.lastPing = new Date().toISOString();
          this.state.storage.put(`connection:${connectionId}`, connData.connection);
        } catch (error) {
          // Connection closed, clean up
          this.removeConnection(connectionId);
          clearInterval(pingInterval);
        }
      } else {
        clearInterval(pingInterval);
      }
    }, 30000); // Ping every 30 seconds

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': this.env.CORS_ORIGIN || '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    });
  }

  private async handleNotify(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json() as {
        connectionId?: string;
        userId?: string;
        message: NotificationMessage;
      };

      const { connectionId, userId, message } = body;

      if (connectionId) {
        // Send to specific connection
        return this.sendToConnection(connectionId, message);
      } else if (userId) {
        // Send to all connections for this user
        return this.sendToUser(userId, message);
      } else {
        return new Response('Missing connectionId or userId', { status: 400 });
      }
    } catch (error) {
      console.error('Error handling notify:', error);
      return new Response('Invalid request body', { status: 400 });
    }
  }

  private async handleDisconnect(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const connectionId = url.searchParams.get('connectionId');

    if (!connectionId) {
      return new Response('Missing connectionId parameter', { status: 400 });
    }

    await this.removeConnection(connectionId);
    return new Response('OK', { status: 200 });
  }

  private async handleStatus(request: Request): Promise<Response> {
    const connections = Array.from(this.connections.values()).map(({ connection }) => ({
      id: connection.id,
      userId: connection.userId,
      connectedAt: connection.connectedAt,
      lastPing: connection.lastPing,
      isActive: connection.isActive
    }));

    return new Response(JSON.stringify({
      totalConnections: connections.length,
      connections
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async sendToConnection(connectionId: string, message: NotificationMessage): Promise<Response> {
    const connData = this.connections.get(connectionId);
    
    if (!connData) {
      return new Response('Connection not found', { status: 404 });
    }

    try {
      const event = createNotificationEvent(message, message.id);
      connData.controller.enqueue(new TextEncoder().encode(event));
      
      return new Response('Notification sent', { status: 200 });
    } catch (error) {
      // Connection likely closed
      await this.removeConnection(connectionId);
      return new Response('Connection closed', { status: 410 });
    }
  }

  private async sendToUser(userId: string, message: NotificationMessage): Promise<Response> {
    let sentCount = 0;
    const errors: string[] = [];

    for (const [connectionId, { connection, controller }] of this.connections) {
      if (connection.userId === userId && connection.isActive) {
        try {
          const event = createNotificationEvent(message, message.id);
          controller.enqueue(new TextEncoder().encode(event));
          sentCount++;
        } catch (error) {
          errors.push(`Failed to send to connection ${connectionId}: ${error}`);
          await this.removeConnection(connectionId);
        }
      }
    }

    if (sentCount === 0) {
      return new Response('No active connections found for user', { status: 404 });
    }

    return new Response(JSON.stringify({
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private async removeConnection(connectionId: string): Promise<void> {
    const connData = this.connections.get(connectionId);
    
    if (connData) {
      try {
        // Send disconnect event
        const disconnectEvent = createSSEEvent('connection-status', {
          connectionId,
          status: 'disconnected',
          timestamp: new Date().toISOString()
        });
        connData.controller.enqueue(new TextEncoder().encode(disconnectEvent));
        connData.controller.close();
      } catch (error) {
        // Ignore errors when closing
      }
      
      this.connections.delete(connectionId);
    }

    // Remove from durable object state
    await this.state.storage.delete(`connection:${connectionId}`);
  }

  private async cleanupStaleConnections(): Promise<void> {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [connectionId, { connection }] of this.connections) {
      const lastPing = new Date(connection.lastPing || connection.connectedAt).getTime();
      
      if (now - lastPing > staleThreshold) {
        console.log(`Cleaning up stale connection: ${connectionId}`);
        await this.removeConnection(connectionId);
      }
    }
  }

  // Cleanup when durable object is evicted
  async alarm(): Promise<void> {
    await this.cleanupStaleConnections();
    
    // Schedule next cleanup
    await this.state.storage.setAlarm(Date.now() + 300000); // 5 minutes
  }
}