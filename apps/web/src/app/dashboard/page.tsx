'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard/layout';
import { auth, webhooks, connections, history } from '@/lib/pocketbase';
import { useSSE } from '@/hooks/use-sse';
import type { WebhookConfig, SSEConnection, NotificationHistory, User } from '@/types';

interface DashboardStats {
  totalWebhooks: number;
  activeWebhooks: number;
  activeConnections: number;
  recentNotifications: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalWebhooks: 0,
    activeWebhooks: 0,
    activeConnections: 0,
    recentNotifications: 0,
  });
  const [recentHistory, setRecentHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize SSE connection
  const {
    isConnected,
    connectionStatus,
    error: sseError,
    connect: connectSSE,
    disconnect: disconnectSSE,
  } = useSSE({
    userId: user?.id || '',
    enabled: !!user?.id,
    onNotification: (notification) => {
      console.log('Received notification:', notification);
      // Refresh recent history when new notifications arrive
      loadRecentHistory();
    },
  });

  useEffect(() => {
    // Check authentication and load initial data
    const currentUser = auth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      loadDashboardData();
    } else {
      // Redirect to login if not authenticated
      window.location.href = '/auth/login';
    }
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [webhookList, connectionList, historyData] = await Promise.all([
        webhooks.list(),
        connections.list(),
        history.list(1, 10), // Get recent 10 notifications
      ]);

      // Calculate stats
      setStats({
        totalWebhooks: webhookList.length,
        activeWebhooks: webhookList.filter(w => w.url && w.type).length, // Consider webhooks with url and type as active
        activeConnections: connectionList.length,
        recentNotifications: historyData.totalItems,
      });

      setRecentHistory(historyData.items);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentHistory = async () => {
    try {
      const historyData = await history.list(1, 10);
      setRecentHistory(historyData.items);
      
      // Update recent notifications count
      setStats(prev => ({
        ...prev,
        recentNotifications: historyData.totalItems,
      }));
    } catch (error) {
      console.error('Failed to refresh history:', error);
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'fallback':
        return <Badge variant="secondary">Fallback</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading dashboard...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user?.name || user?.email}
            </p>
          </div>
          
          {/* SSE Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <span className="text-sm text-muted-foreground">
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'reconnecting' ? 'Reconnecting...' : 
               'Disconnected'}
            </span>
            {!isConnected && (
              <Button size="sm" onClick={connectSSE}>
                Reconnect
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
              <span className="text-2xl">🔗</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalWebhooks}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeWebhooks} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
              <span className="text-2xl">🔌</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeConnections}</div>
              <p className="text-xs text-muted-foreground">
                SSE connections
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Notifications</CardTitle>
              <span className="text-2xl">🔔</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentNotifications}</div>
              <p className="text-xs text-muted-foreground">
                Total sent
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
              <span className="text-2xl">📡</span>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isConnected ? 'Online' : 'Offline'}
              </div>
              <p className="text-xs text-muted-foreground">
                Real-time updates
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
            <CardDescription>
              Latest notification delivery attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentHistory.length > 0 ? (
              <div className="space-y-4">
                {recentHistory.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {notification.message.title || 'Notification'}
                        </span>
                        {formatStatus(notification.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {notification.message.body || 'No content'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(notification.sentAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <Button asChild variant="outline" className="w-full">
                    <a href="/dashboard/notifications">View All Notifications</a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No notifications yet. Configure a webhook to get started.
              </div>
            )}
          </CardContent>
        </Card>

        {/* SSE Error Display */}
        {sseError && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Connection Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{sseError}</p>
              <Button className="mt-2" onClick={connectSSE}>
                Retry Connection
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}