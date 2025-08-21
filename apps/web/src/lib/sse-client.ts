'use client';

import type { SSEEvent, NotificationMessage } from '@mcp-notifications/shared';

export interface SSEClientOptions {
  userId: string;
  sseServerUrl: string;
  onNotification?: (notification: NotificationMessage) => void;
  onConnectionStatus?: (status: 'connected' | 'disconnected' | 'reconnecting') => void;
  onError?: (error: string) => void;
  reconnectInterval?: number;
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private options: SSEClientOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionId: string | null = null;

  constructor(options: SSEClientOptions) {
    this.options = {
      reconnectInterval: 5000,
      ...options,
    };
  }

  connect(): void {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      return; // Already connected
    }

    this.disconnect(); // Clean up any existing connection

    const url = new URL('/sse/connect', this.options.sseServerUrl);
    url.searchParams.set('userId', this.options.userId);

    this.eventSource = new EventSource(url.toString());

    this.eventSource.onopen = () => {
      console.log('SSE connection opened');
      this.reconnectAttempts = 0;
      this.options.onConnectionStatus?.('connected');
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEvent;
        this.handleSSEEvent(data);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.options.onError?.('Connection error occurred');
      this.options.onConnectionStatus?.('disconnected');
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.options.onError?.('Max reconnection attempts reached');
      }
    };

    // Setup event listeners for different event types
    this.eventSource.addEventListener('notification', (event) => {
      try {
        const notification = JSON.parse(event.data) as NotificationMessage;
        this.options.onNotification?.(notification);
      } catch (error) {
        console.error('Failed to parse notification:', error);
      }
    });

    this.eventSource.addEventListener('connection-status', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'connected') {
          this.connectionId = data.connectionId;
          this.options.onConnectionStatus?.('connected');
        } else if (data.status === 'disconnected') {
          this.connectionId = null;
          this.options.onConnectionStatus?.('disconnected');
        }
      } catch (error) {
        console.error('Failed to parse connection status:', error);
      }
    });

    this.eventSource.addEventListener('ping', (event) => {
      // Handle ping events (keep connection alive)
      console.debug('Received ping from server');
    });

    this.eventSource.addEventListener('error', (event) => {
      try {
        const data = JSON.parse(event.data);
        this.options.onError?.(data.error || 'Unknown server error');
      } catch (error) {
        this.options.onError?.('Server error occurred');
      }
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.connectionId) {
      // Notify server about disconnection
      const url = new URL('/sse/disconnect', this.options.sseServerUrl);
      url.searchParams.set('connectionId', this.connectionId);
      
      fetch(url.toString(), { method: 'POST' }).catch(error => {
        console.error('Failed to notify server about disconnection:', error);
      });
      
      this.connectionId = null;
    }

    this.options.onConnectionStatus?.('disconnected');
  }

  getConnectionId(): string | null {
    return this.connectionId;
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  private handleSSEEvent(event: SSEEvent): void {
    switch (event.type) {
      case 'notification':
        this.options.onNotification?.(event.data as NotificationMessage);
        break;
      case 'ping':
        // Ping received, connection is alive
        break;
      case 'error':
        this.options.onError?.(event.data.error || 'Unknown error');
        break;
      case 'config-update':
        // Handle configuration updates if needed
        console.log('Configuration updated:', event.data);
        break;
      case 'connection-status':
        if (event.data.status === 'connected') {
          this.connectionId = event.data.connectionId;
          this.options.onConnectionStatus?.('connected');
        } else if (event.data.status === 'disconnected') {
          this.connectionId = null;
          this.options.onConnectionStatus?.('disconnected');
        }
        break;
      default:
        console.warn('Unknown SSE event type:', event.type);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Reconnect already scheduled
    }

    this.reconnectAttempts++;
    this.options.onConnectionStatus?.('reconnecting');

    // Use a moderate base multiplier (default 1000ms, min 500ms, max 5000ms)
    const baseInterval = Math.max(500, Math.min(this.options.reconnectInterval ?? 1000, 5000));
    // Cap maximum delay at 10 seconds
    const delay = Math.min(
      baseInterval * Math.pow(2, this.reconnectAttempts - 1),
      10000 // Max 10 seconds
    );

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  // Send a test notification
  async sendTestNotification(message: NotificationMessage): Promise<void> {
    const response = await fetch(`${this.options.sseServerUrl}/api/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: this.options.userId,
        connectionId: this.connectionId,
        message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send test notification: ${error}`);
    }
  }
}