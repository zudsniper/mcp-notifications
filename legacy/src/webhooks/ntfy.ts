import { NotificationMessage, NotificationAction } from '../config/types.js';
import { BaseWebhookFormatter } from './base.js';
import { getTemplate, hasTemplate } from '../templates/notification.js';

import fsModule from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import urlModule from 'url';

const fs = fsModule.promises;
/**
 * Formatter for ntfy webhooks
 * 
 * ntfy accepts simple POST requests with body as the main message
 * and uses HTTP headers for additional functionality
 * 
 * @see https://docs.ntfy.sh/publish/
 */
export class NtfyWebhookFormatter extends BaseWebhookFormatter {
  formatMessage(message: NotificationMessage): any {
    let body = message.body;
    
    // Check for template usage
    if (message.template && hasTemplate(message.template)) {
      // Use predefined template
      const template = getTemplate(message.template);
      if (template) {
        // Add template header
        this.templatedMessage = template.message;
        this.templatedTitle = template.title;
        this.useTemplate = true;
        
        // Use original message as a fallback if template fails
        return message.body;
      }
    }
    // Fallback to custom template if defined in config
    else if (this.config.templates?.message) {
      body = this.applyTemplate(this.config.templates.message, message);
    }
    
    return body;
  }

  // Track if we're using a template
  private templatedMessage: string | null = null;
  private templatedTitle: string | null = null;
  private useTemplate: boolean = false;

  formatHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'text/markdown',
      'X-Markdown': 'true',  // Enable Markdown formatting
    };
    return headers;
  }

  /**
   * Legacy synchronous prepareRequest for backward compatibility
   */
  prepareRequest(message: NotificationMessage): {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
  } {
    const headers = this.formatHeaders();
    const config = this.config;

    // Priority handling (1-5, default 3)
    const priority = message.priority ?? config.defaultPriority ?? 3;
    headers['Priority'] = String(Math.max(1, Math.min(5, priority)));

    // Authentication
    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    // Templates for Title
    if (config.templates?.title) {
      headers['Title'] = this.sanitizeTitle(this.applyTemplate(config.templates.title, message));
    } else if (message.title) {
      headers['Title'] = this.sanitizeTitle(message.title);
    }

    // Click action (uses message.link)
    if (message.link) {
      headers['Click'] = message.link;
    }

    // Attachments (uses message.attachments or message.imageUrl)
    const attachments = message.attachments ?? (message.imageUrl ? [message.imageUrl] : []);
    if (attachments.length > 0) {
      headers['Attach'] = attachments.join(', ');
    }
    
    // Actions (combine config defaults and message actions)
    const allActions = [
      ...(config.defaultActions ?? []),
      ...(message.actions ?? [])
    ];
    if (allActions.length > 0) {
      headers['Actions'] = allActions
        .map(a => this.formatAction(a))
        .join('; ');
    }

    return {
      url: config.url,
      method: 'POST',
      headers: headers,
      body: this.formatMessage(message)
    };
  }

  /**
   * New async method to prepare upload + notification requests
   */
  async prepareRequests(message: NotificationMessage): Promise<Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
  }>> {
    const config = this.config;
    const requests = [];

    function isLocalFile(filePath: string): boolean {
      try {
        return Boolean(filePath) && fsModule.existsSync(filePath) && fsModule.statSync(filePath).isFile();
      } catch {
        return false;
      }
    }

    function getMimeType(filename: string): string {
      const ext = path.extname(filename).toLowerCase();
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          return 'image/jpeg';
        case '.png':
          return 'image/png';
        case '.gif':
          return 'image/gif';
        case '.webp':
          return 'image/webp';
        default:
          return 'application/octet-stream';
      }
    }

    let attachmentUrls: string[] = message.attachments ? [...message.attachments] : [];

    const filePath = message.imageUrl; // support imageUrl for backward compatibility
    if (filePath && isLocalFile(filePath)) {
      try {
        const stat = fsModule.statSync(filePath);
        const maxSize = 15 * 1024 * 1024;
        if (stat.size <= maxSize) {
          const topicUrl = config.url;
          const parsedUrl = new URL(topicUrl);
          const topic = parsedUrl.pathname.replace(/^\//, '');
          const filename = path.basename(filePath);

          const fileBuffer = fsModule.readFileSync(filePath);
          const mimeType = getMimeType(filename);

          // Build PUT URL with metadata as query parameters
          const putUrl = new URL(`${parsedUrl.origin}/${topic}`);
          if (message.title) putUrl.searchParams.append('title', message.title);
          if (message.body) {
            putUrl.searchParams.append('message', message.body);
          }
          const priorityVal = message.priority ?? config.defaultPriority ?? 3;
          putUrl.searchParams.append('priority', String(Math.max(1, Math.min(5, priorityVal))));
          putUrl.searchParams.append('filename', filename);
          putUrl.searchParams.append('markdown', 'true');

          const uploadHeaders: Record<string, string> = {
            'Content-Type': mimeType
          };
          if (config.token) {
            uploadHeaders['Authorization'] = `Bearer ${config.token}`;
          }

          requests.push({
            url: putUrl.toString(),
            method: 'PUT',
            headers: uploadHeaders,
            body: fileBuffer
          });

          // Skip adding POST request later
          return requests;
        } else {
          console.warn(`ntfy upload skipped: file size ${stat.size} exceeds 15MB`);
        }
      } catch (err) {
        console.error('ntfy upload error:', err);
      }
    }

    const headers = this.formatHeaders();

    const priority = message.priority ?? config.defaultPriority ?? 3;
    headers['Priority'] = String(Math.max(1, Math.min(5, priority)));

    if (config.token) {
      headers['Authorization'] = `Bearer ${config.token}`;
    }

    if (config.templates?.title) {
      headers['Title'] = this.sanitizeTitle(this.applyTemplate(config.templates.title, message));
    } else if (message.title) {
      headers['Title'] = this.sanitizeTitle(message.title);
    }

    if (message.link) {
      headers['Click'] = message.link;
    }

    if (attachmentUrls.length > 0) {
      headers['Attach'] = attachmentUrls.join(', ');
    }

    const allActions = [
      ...(config.defaultActions ?? []),
      ...(message.actions ?? [])
    ];
    if (allActions.length > 0) {
      headers['Actions'] = allActions
        .map(a => this.formatAction(a))
        .join('; ');
    }

    // Only add POST request if no image upload PUT was added
    if (requests.length === 0) {
      requests.push({
        url: config.url,
        method: 'POST',
        headers: headers,
        body: this.formatMessage(message)
      });
    }

    return requests;
  }

  /**
   * Apply simple templating to a string
   */
  private applyTemplate(template: string, message: NotificationMessage): string {
    return template
      .replace('{priority}', String(message.priority ?? this.config.defaultPriority ?? 3))
      .replace('{title}', message.title ?? '')
      .replace('{body}', message.body)
      .replace('{link}', message.link ?? '')
      .replace('{imageUrl}', message.imageUrl ?? '') // Keep for backward compatibility
      .replace('{attachments}', (message.attachments ?? (message.imageUrl ? [message.imageUrl] : [])).join(', ') ?? '')
      .replace('{actionsCount}', String(message.actions?.length ?? 0));
  }

  /**
   * Format a single action object into the ntfy string format
   * Format: type,label,url[,option=value,...]
   */
  private formatAction(action: NotificationAction): string {
    const parts: (string | number | boolean)[] = [action.action, action.label, action.url];
    const options: string[] = [];
    
    if (action.method) options.push(`method=${action.method}`);
    if (action.clear) options.push('clear=true');
    
    if (action.headers) {
      options.push(...Object.entries(action.headers)
        .map(([k, v]) => `header:${k}=${this.quoteIfNecessary(v)}`));
    }
    
    if (action.body) options.push(`body=${this.quoteIfNecessary(action.body)}`);
    
    return [...parts, ...options].map(p => this.quoteIfNecessary(String(p))).join(', ');
  }

  /**
   * Quote a string if it contains commas or semicolons
   */
  private quoteIfNecessary(value: string): string {
    if (value.includes(',') || value.includes(';')) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }

  /**
   * Sanitize title by removing emojis and non-ASCII characters
   */
  private sanitizeTitle(title: string | undefined | null): string {
    if (!title) return '';
    return title.replace(/[^\x00-\x7F]/g, '');
  }
}
