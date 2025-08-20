import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return formatDate(d);
}

export function getWebhookTypeColor(type: string): string {
  const colors: Record<string, string> = {
    discord: 'bg-indigo-100 text-indigo-800',
    slack: 'bg-green-100 text-green-800',
    teams: 'bg-blue-100 text-blue-800',
    feishu: 'bg-purple-100 text-purple-800',
    ntfy: 'bg-orange-100 text-orange-800',
    generic: 'bg-gray-100 text-gray-800',
    custom: 'bg-yellow-100 text-yellow-800',
  };

  return colors[type] || colors.generic;
}

export function getStatusColor(status: 'sent' | 'failed' | 'fallback'): string {
  const colors = {
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    fallback: 'bg-yellow-100 text-yellow-800',
  };

  return colors[status];
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'absolute';
    textArea.style.left = '-999999px';
    document.body.prepend(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
    } catch (error) {
      console.error('Failed to copy text:', error);
      throw error;
    } finally {
      textArea.remove();
    }
    
    return Promise.resolve();
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getWebhookProviderName(type: string): string {
  const names: Record<string, string> = {
    discord: 'Discord',
    slack: 'Slack',
    teams: 'Microsoft Teams',
    feishu: 'Feishu',
    ntfy: 'ntfy',
    generic: 'Generic Webhook',
    custom: 'Custom Webhook',
  };

  return names[type] || 'Unknown';
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}