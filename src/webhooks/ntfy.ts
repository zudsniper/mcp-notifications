import { NotificationMessage, NotificationAction } from '../config/types.js';
import { BaseWebhookFormatter } from './base.js';
import { getTemplate, hasTemplate } from '../templates/notification.js';

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
      'Content-Type': 'text/plain',
    };
    return headers;
  }

  /**
   * The ntfy service uses HTTP headers for metadata
   * Override the send method to handle this
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

    // Handle templating
    if (this.useTemplate) {
      // Enable Go templating
      headers['X-Template'] = 'yes';
      
      // Set title template if we have one
      if (this.templatedTitle) {
        headers['Title'] = this.templatedTitle;
      } else if (message.title) {
        headers['Title'] = message.title;
      }
      
      // The body is the JSON payload with the template data
      const templateData = message.templateData || {
        // Default template data from the message
        title: message.title,
        body: message.body
      };
      
      return {
        url: config.url,
        method: 'POST',
        headers: headers,
        body: JSON.stringify(templateData)
      };
    }
    
    // Regular (non-template) handling continues here
    
    // Templates for Title
    if (config.templates?.title) {
      headers['Title'] = this.applyTemplate(config.templates.title, message);
    } else if (message.title) {
      headers['Title'] = message.title;
    }

    // Click action (uses message.link)
    if (message.link) {
      headers['Click'] = message.link;
    }

    // Attachments (uses message.attachments or message.imageUrl)
    const attachments = message.attachments ?? (message.imageUrl ? [message.imageUrl] : []);
    if (attachments.length > 0) {
      // Ntfy expects comma-separated URLs for the Attach header according to some examples, 
      // even though docs mention multiple headers. Using comma-separated for compatibility.
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
        .join('; '); // Actions are separated by semicolons
    }
    
    // Additional headers could be added here for other ntfy features
    // like tags, icons, email, call, etc.

    return {
      url: config.url,
      method: 'POST',
      headers: headers,
      body: this.formatMessage(message)
    };
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
    
    // Headers need careful formatting: header:Key=Value
    if (action.headers) {
      options.push(...Object.entries(action.headers)
        .map(([k, v]) => `header:${k}=${this.quoteIfNecessary(v)}`));
    }
    
    // Body needs URL encoding if it contains special chars
    if (action.body) options.push(`body=${this.quoteIfNecessary(action.body)}`);
    
    // Join parts and options. Options are comma-separated.
    return [...parts, ...options].map(p => this.quoteIfNecessary(String(p))).join(', ');
  }

  /**
   * Quote a string if it contains commas or semicolons
   */
  private quoteIfNecessary(value: string): string {
      if (value.includes(',') || value.includes(';')) {
          // Escape existing quotes and wrap in double quotes
          return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
  }
}
