import { NotificationMessage } from '../config/types.js';
import { BaseWebhookFormatter } from './base.js';

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
    // ntfy uses the POST body as the main message content
    // and headers for additional functionality
    return message.body;
  }

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

    // Add title if provided
    if (message.title) {
      headers['Title'] = message.title;
    }

    // Add link if provided
    if (message.link) {
      headers['Click'] = message.link;
    }

    // Add image if provided
    if (message.imageUrl) {
      headers['Attach'] = message.imageUrl;
    }
    
    // Additional headers could be added here for other ntfy features
    // like tags, priority, actions, etc.

    return {
      url: this.config.url,
      method: 'POST',
      headers: headers,
      body: this.formatMessage(message)
    };
  }
}
