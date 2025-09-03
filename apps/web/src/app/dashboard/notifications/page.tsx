'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DashboardLayout from '@/components/dashboard/layout';
import { auth, history } from '@/lib/pocketbase';
import type { NotificationHistory, User } from '@/types';

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotification, setSelectedNotification] = useState<NotificationHistory | null>(null);
  
  const perPage = 20;

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      loadNotifications();
    } else {
      window.location.href = '/auth/login';
    }
  }, [currentPage]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const result = await history.list(currentPage, perPage);
      setNotifications(result.items);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-500">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'fallback':
        return <Badge variant="secondary">Fallback</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  const filteredNotifications = notifications.filter(notification => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      notification.message.title?.toLowerCase().includes(searchLower) ||
      notification.message.body?.toLowerCase().includes(searchLower) ||
      notification.status.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'fallback':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading notifications...</div>
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
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">
              View your notification delivery history
            </p>
          </div>
          
          {/* Search */}
          <div className="w-64">
            <Input
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {notifications.filter(n => n.status === 'sent').length}
              </div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">
                {notifications.filter(n => n.status === 'failed').length}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {notifications.filter(n => n.status === 'fallback').length}
              </div>
              <div className="text-sm text-muted-foreground">Fallback</div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications List */}
        <Card>
          <CardHeader>
            <CardTitle>Notification History</CardTitle>
            <CardDescription>
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredNotifications.length > 0 ? (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => {
                  const dateTime = formatDate(notification.sentAt);
                  return (
                    <div
                      key={notification.id}
                      className="flex items-start justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedNotification(notification)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">
                            {notification.message.title || 'Untitled Notification'}
                          </h3>
                          {formatStatus(notification.status)}
                        </div>
                        
                        <p className="text-sm text-muted-foreground truncate mb-2">
                          {notification.message.body || 'No content'}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{dateTime.date} at {dateTime.time}</span>
                          {notification.connectionId && (
                            <span>Connection: {notification.connectionId.slice(0, 8)}...</span>
                          )}
                          {notification.message.priority && (
                            <span>Priority: {notification.message.priority}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {notification.error && (
                          <span className="text-xs text-red-600">Error</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          →
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔔</div>
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? 'No matching notifications' : 'No notifications yet'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'Try adjusting your search terms'
                    : 'Notifications will appear here once you start sending them'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Detail Modal */}
        {selectedNotification && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedNotification(null)}>
            <Card className="w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Notification Details</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setSelectedNotification(null)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <div className="mt-1 p-2 bg-muted rounded">
                    {selectedNotification.message.title || 'No title'}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">Body</label>
                  <div className="mt-1 p-2 bg-muted rounded min-h-[60px]">
                    {selectedNotification.message.body || 'No content'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="mt-1">
                      {formatStatus(selectedNotification.status)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Sent At</label>
                    <div className="mt-1 text-sm">
                      {formatDate(selectedNotification.sentAt).date} at {formatDate(selectedNotification.sentAt).time}
                    </div>
                  </div>
                </div>
                
                {selectedNotification.message.priority && (
                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <div className="mt-1 text-sm">
                      {selectedNotification.message.priority}/5
                    </div>
                  </div>
                )}
                
                {selectedNotification.response && (
                  <div>
                    <label className="text-sm font-medium">Response</label>
                    <div className="mt-1 p-2 bg-muted rounded font-mono text-xs overflow-x-auto">
                      {selectedNotification.response}
                    </div>
                  </div>
                )}
                
                {selectedNotification.error && (
                  <div>
                    <label className="text-sm font-medium">Error</label>
                    <div className="mt-1 p-2 bg-destructive/10 text-destructive rounded text-sm">
                      {selectedNotification.error}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium">Webhook Configuration</label>
                  <div className="mt-1 p-2 bg-muted rounded font-mono text-xs overflow-x-auto max-h-32">
                    {JSON.stringify(selectedNotification.webhookConfig, null, 2)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}