'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { SSEClient, type SSEClientOptions } from '@/lib/sse-client';
import { auth } from '@/lib/pocketbase';
import type { NotificationMessage } from '@mcp-notifications/shared';

interface UseSSEOptions {
  autoConnect?: boolean;
  onNotification?: (notification: NotificationMessage) => void;
  onError?: (error: string) => void;
}

interface UseSSEReturn {
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  connectionId: string | null;
  notifications: NotificationMessage[];
  connect: () => void;
  disconnect: () => void;
  sendTestNotification: (message: NotificationMessage) => Promise<void>;
  clearNotifications: () => void;
}

export function useSSE(options: UseSSEOptions = {}): UseSSEReturn {
  const { autoConnect = true, onNotification, onError } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  
  const clientRef = useRef<SSEClient | null>(null);

  const handleNotification = useCallback((notification: NotificationMessage) => {
    setNotifications(prev => [notification, ...prev.slice(0, 99)]); // Keep last 100 notifications
    onNotification?.(notification);
  }, [onNotification]);

  const handleConnectionStatus = useCallback((status: 'connected' | 'disconnected' | 'reconnecting') => {
    setConnectionStatus(status);
    setIsConnected(status === 'connected');
    
    if (status === 'connected' && clientRef.current) {
      setConnectionId(clientRef.current.getConnectionId());
    } else {
      setConnectionId(null);
    }
  }, []);

  const handleError = useCallback((error: string) => {
    console.error('SSE Error:', error);
    onError?.(error);
  }, [onError]);

  const connect = useCallback(() => {
    const user = auth.getCurrentUser();
    if (!user) {
      handleError('User not authenticated');
      return;
    }

    if (clientRef.current) {
      clientRef.current.disconnect();
    }

    const sseServerUrl = process.env.NEXT_PUBLIC_SSE_SERVER_URL || 'https://mcp-notifications-sse.your-worker-domain.workers.dev';

    const clientOptions: SSEClientOptions = {
      userId: user.id,
      sseServerUrl,
      onNotification: handleNotification,
      onConnectionStatus: handleConnectionStatus,
      onError: handleError,
    };

    clientRef.current = new SSEClient(clientOptions);
    clientRef.current.connect();
  }, [handleNotification, handleConnectionStatus, handleError]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
      clientRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setConnectionId(null);
  }, []);

  const sendTestNotification = useCallback(async (message: NotificationMessage) => {
    if (!clientRef.current) {
      throw new Error('SSE client not connected');
    }
    
    await clientRef.current.sendTestNotification(message);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Auto connect/disconnect based on authentication
  useEffect(() => {
    if (autoConnect && auth.isAuthenticated()) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Listen for authentication changes
  useEffect(() => {
    const handleAuthChange = () => {
      if (auth.isAuthenticated() && autoConnect) {
        connect();
      } else {
        disconnect();
      }
    };

    // Check auth state periodically
    const interval = setInterval(() => {
      const wasAuthenticated = isConnected;
      const isAuthenticated = auth.isAuthenticated();
      
      if (wasAuthenticated && !isAuthenticated) {
        disconnect();
      } else if (!wasAuthenticated && isAuthenticated && autoConnect) {
        connect();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [autoConnect, connect, disconnect, isConnected]);

  return {
    isConnected,
    connectionStatus,
    connectionId,
    notifications,
    connect,
    disconnect,
    sendTestNotification,
    clearNotifications,
  };
}