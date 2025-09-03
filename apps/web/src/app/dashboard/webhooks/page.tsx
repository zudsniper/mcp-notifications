'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DashboardLayout from '@/components/dashboard/layout';
import { auth, webhooks } from '@/lib/pocketbase';
import type { WebhookConfig, User } from '@/types';

const WEBHOOK_TYPES = [
  { value: 'discord', label: 'Discord', icon: '🎮' },
  { value: 'slack', label: 'Slack', icon: '💬' },
  { value: 'teams', label: 'Microsoft Teams', icon: '👔' },
  { value: 'feishu', label: 'Feishu', icon: '🐦' },
  { value: 'ntfy', label: 'Ntfy', icon: '📢' },
  { value: 'generic', label: 'Generic Webhook', icon: '🔗' },
  { value: 'custom', label: 'Custom', icon: '⚙️' },
];

export default function WebhooksPage() {
  const [user, setUser] = useState<User | null>(null);
  const [webhookList, setWebhookList] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    type: 'discord',
    token: '',
    username: '',
    avatarUrl: '',
    fallbackUrl: '',
    fallbackType: '',
  });

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      loadWebhooks();
    } else {
      window.location.href = '/auth/login';
    }
  }, []);

  const loadWebhooks = async () => {
    try {
      setLoading(true);
      const webhookData = await webhooks.list();
      setWebhookList(webhookData);
    } catch (error) {
      console.error('Failed to load webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const webhookData = {
        name: formData.name,
        url: formData.url,
        type: formData.type,
        token: formData.token || undefined,
        username: formData.username || undefined,
        avatarUrl: formData.avatarUrl || undefined,
        fallbackUrl: formData.fallbackUrl || undefined,
        fallbackType: formData.fallbackType || undefined,
      };

      if (editingWebhook) {
        await webhooks.update(editingWebhook.id, webhookData);
      } else {
        await webhooks.create(webhookData);
      }

      // Reset form and reload webhooks
      setFormData({
        name: '',
        url: '',
        type: 'discord',
        token: '',
        username: '',
        avatarUrl: '',
        fallbackUrl: '',
        fallbackType: '',
      });
      setShowForm(false);
      setEditingWebhook(null);
      loadWebhooks();
    } catch (error) {
      console.error('Failed to save webhook:', error);
    }
  };

  const handleEdit = (webhook: WebhookConfig) => {
    setFormData({
      name: webhook.name || '',
      url: webhook.url,
      type: webhook.type,
      token: webhook.token || '',
      username: webhook.username || '',
      avatarUrl: webhook.avatarUrl || '',
      fallbackUrl: webhook.fallbackUrl || '',
      fallbackType: webhook.fallbackType || '',
    });
    setEditingWebhook(webhook);
    setShowForm(true);
  };

  const handleDelete = async (webhook: WebhookConfig) => {
    if (window.confirm('Are you sure you want to delete this webhook?')) {
      try {
        await webhooks.delete(webhook.id);
        loadWebhooks();
      } catch (error) {
        console.error('Failed to delete webhook:', error);
      }
    }
  };

  const testWebhook = async (webhook: WebhookConfig) => {
    try {
      // Send a test notification using the webhook
      const response = await fetch(`${process.env.NEXT_PUBLIC_SSE_SERVER_URL}/api/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          message: {
            title: 'Test Notification',
            body: 'This is a test notification from MCP Notifications',
            priority: 3,
            timestamp: new Date().toISOString(),
          },
          webhookConfig: webhook,
        }),
      });

      if (response.ok) {
        alert('Test notification sent successfully!');
      } else {
        const errorData = await response.json();
        alert(`Test failed: ${errorData.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Test notification failed:', error);
      alert('Test failed: Network error');
    }
  };

  const getWebhookTypeInfo = (type: string) => {
    return WEBHOOK_TYPES.find(t => t.value === type) || WEBHOOK_TYPES[0];
  };

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading webhooks...</div>
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
            <h1 className="text-3xl font-bold tracking-tight">Webhooks</h1>
            <p className="text-muted-foreground">
              Manage your notification webhook endpoints
            </p>
          </div>
          <Button
            onClick={() => {
              setShowForm(true);
              setEditingWebhook(null);
              setFormData({
                name: '',
                url: '',
                type: 'discord',
                token: '',
                username: '',
                avatarUrl: '',
                fallbackUrl: '',
                fallbackType: '',
              });
            }}
          >
            Add Webhook
          </Button>
        </div>

        {/* Webhook Form */}
        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>
                {editingWebhook ? 'Edit Webhook' : 'Add New Webhook'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="My Discord Webhook"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {WEBHOOK_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Webhook URL</label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://discord.com/api/webhooks/..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Token (Optional)</label>
                    <Input
                      type="password"
                      value={formData.token}
                      onChange={(e) => setFormData(prev => ({ ...prev, token: e.target.value }))}
                      placeholder="Authentication token if required"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Username (Optional)</label>
                    <Input
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Bot username"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Avatar URL (Optional)</label>
                  <Input
                    value={formData.avatarUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, avatarUrl: e.target.value }))}
                    placeholder="https://example.com/avatar.png"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fallback URL (Optional)</label>
                    <Input
                      value={formData.fallbackUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, fallbackUrl: e.target.value }))}
                      placeholder="Backup webhook URL"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Fallback Type (Optional)</label>
                    <select
                      value={formData.fallbackType}
                      onChange={(e) => setFormData(prev => ({ ...prev, fallbackType: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select fallback type...</option>
                      {WEBHOOK_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingWebhook ? 'Update' : 'Create'} Webhook
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingWebhook(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Webhooks List */}
        <div className="space-y-4">
          {webhookList.length > 0 ? (
            webhookList.map((webhook) => {
              const typeInfo = getWebhookTypeInfo(webhook.type);
              return (
                <Card key={webhook.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{typeInfo.icon}</span>
                          <div>
                            <h3 className="font-semibold">
                              {webhook.name || `${typeInfo.label} Webhook`}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {webhook.url}
                            </p>
                          </div>
                          <Badge variant="secondary">{typeInfo.label}</Badge>
                        </div>
                        
                        {webhook.username && (
                          <p className="text-sm text-muted-foreground">
                            Username: {webhook.username}
                          </p>
                        )}
                        
                        {webhook.fallbackUrl && (
                          <p className="text-sm text-muted-foreground">
                            Fallback: {webhook.fallbackUrl}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testWebhook(webhook)}
                        >
                          Test
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(webhook)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(webhook)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="text-6xl mb-4">🔗</div>
                <h3 className="text-lg font-medium mb-2">No webhooks configured</h3>
                <p className="text-muted-foreground mb-4">
                  Add your first webhook to start receiving notifications
                </p>
                <Button onClick={() => setShowForm(true)}>
                  Add Your First Webhook
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}