'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard/layout';
import { auth, connections } from '@/lib/pocketbase';
import { useSSE } from '@/hooks/use-sse';
import type { SSEConnection, User } from '@/types';

export default function ConnectionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [connectionList, setConnectionList] = useState<SSEConnection[]>([]);
  const [loading, setLoading] = useState(true);

  // SSE connection hook
  const {
    isConnected,
    connectionStatus,
    error: sseError,
    connect: connectSSE,
    disconnect: disconnectSSE,
    connectionId: currentConnectionId,
  } = useSSE({
    userId: user?.id || '',
    enabled: !!user?.id,
    onNotification: (notification) => {
      console.log('Received notification:', notification);
    },
  });

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      loadConnections();
    } else {
      window.location.href = '/auth/login';
    }
  }, []);

  // Refresh connections when status changes
  useEffect(() => {
    if (user) {
      loadConnections();
    }
  }, [connectionStatus, user]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const connectionData = await connections.list();
      setConnectionList(connectionData);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getConnectionStatus = (connection: SSEConnection) => {
    const isCurrentConnection = connection.id === currentConnectionId;
    
    if (isCurrentConnection && isConnected) {
      return <Badge variant="default" className="bg-green-500">Active</Badge>;
    }
    
    if (connection.isActive) {
      // Connection is marked as active in DB but not our current connection
      return <Badge variant="secondary">Connected</Badge>;
    }
    
    return <Badge variant="outline">Inactive</Badge>;
  };

  const getBrowserInfo = (userAgent?: string) => {
    if (!userAgent) return { browser: 'Unknown', os: 'Unknown' };
    
    let browser = 'Unknown';
    let os = 'Unknown';
    
    // Detect browser
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';
    
    return { browser, os };
  };

  const sendTestNotification = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SSE_SERVER_URL}/api/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          connectionId: currentConnectionId,
          message: {
            title: 'Test SSE Notification',
            body: `Test message sent at ${new Date().toLocaleTimeString()}`,
            priority: 3,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        alert('Test notification sent! Check your browser console or notification area.');
      } else {
        const errorData = await response.json();
        alert(`Test failed: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Test notification failed:', error);
      alert('Test failed: Network error');
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading connections...</div>
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
            <h1 className="text-3xl font-bold tracking-tight">Connections</h1>
            <p className="text-muted-foreground">
              Manage your SSE connections and real-time status
            </p>
          </div>
          
          {/* Connection Controls */}
          <div className="flex gap-2">
            {isConnected ? (
              <>
                <Button variant="outline" onClick={sendTestNotification}>
                  Send Test
                </Button>
                <Button variant="destructive" onClick={disconnectSSE}>
                  Disconnect
                </Button>
              </>
            ) : (
              <Button onClick={connectSSE}>
                Connect
              </Button>
            )}
          </div>
        </div>

        {/* Current Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Connection</CardTitle>
            <CardDescription>
              Real-time SSE connection status for this browser session
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div>
                  <p className="font-medium">
                    {connectionStatus === 'connected' ? 'Connected' : 
                     connectionStatus === 'reconnecting' ? 'Reconnecting...' : 
                     'Disconnected'}
                  </p>
                  {currentConnectionId && (
                    <p className="text-sm text-muted-foreground">
                      ID: {currentConnectionId}
                    </p>
                  )}
                </div>
              </div>
              
              {sseError && (
                <div className="text-sm text-red-600 max-w-md">
                  Error: {sseError}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* All Connections */}
        <Card>
          <CardHeader>
            <CardTitle>All Connections</CardTitle>
            <CardDescription>
              History of all SSE connections for your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connectionList.length > 0 ? (
              <div className="space-y-4">
                {connectionList.map((connection) => {
                  const { browser, os } = getBrowserInfo(connection.userAgent);
                  const isCurrentConnection = connection.id === currentConnectionId;
                  
                  return (
                    <div
                      key={connection.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        isCurrentConnection ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div>
                            <h3 className="font-medium">
                              {connection.id.slice(0, 12)}...
                              {isCurrentConnection && (
                                <span className="ml-2 text-xs text-primary">(Current)</span>
                              )}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{browser} on {os}</span>
                              {connection.ipAddress && (
                                <span>IP: {connection.ipAddress}</span>
                              )}
                            </div>
                          </div>
                          {getConnectionStatus(connection)}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Connected: {formatDate(connection.connectedAt)}</span>
                          {connection.lastPing && (
                            <span>Last ping: {getTimeSince(connection.lastPing)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {isCurrentConnection && isConnected && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={sendTestNotification}
                          >
                            Test
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔌</div>
                <h3 className="text-lg font-medium mb-2">No connections found</h3>
                <p className="text-muted-foreground mb-4">
                  Start by establishing an SSE connection
                </p>
                {!isConnected && (
                  <Button onClick={connectSSE}>
                    Connect Now
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {connectionList.filter(c => c.isActive).length}
              </div>
              <div className="text-sm text-muted-foreground">Active Connections</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {connectionList.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Connections</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {isConnected ? '✓' : '✗'}
              </div>
              <div className="text-sm text-muted-foreground">Current Status</div>
            </CardContent>
          </Card>
        </div>

        {/* Debug Information */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-sm">
              <div>SSE Server URL: {process.env.NEXT_PUBLIC_SSE_SERVER_URL || 'Not configured'}</div>
              <div>User ID: {user?.id || 'Not available'}</div>
              <div>Current Connection ID: {currentConnectionId || 'None'}</div>
              <div>Connection Status: {connectionStatus}</div>
              <div>Is Connected: {isConnected ? 'Yes' : 'No'}</div>
              {sseError && <div className="text-red-600">Error: {sseError}</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}