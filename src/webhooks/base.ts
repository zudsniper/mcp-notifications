import { NotificationMessage, WebhookConfig } from '../config/types.js';

/**
 * Base webhook formatter interface
 */
export interface WebhookFormatter {
  formatMessage(message: NotificationMessage): any;
  formatHeaders(): Record<string, string>;
}

/**
 * Abstract base class for webhook formatters
 */
export abstract class BaseWebhookFormatter implements WebhookFormatter {
  protected config: WebhookConfig;

  constructor(config: WebhookConfig) {
    this.config = config;
  }

  /**
   * Format message according to webhook provider's requirements
   */
  abstract formatMessage(message: NotificationMessage): any;

  /**
   * Get HTTP headers for the webhook request
   */
  formatHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }
}

/**
 * A generic webhook formatter that works with simple JSON payloads
 */
export class GenericWebhookFormatter extends BaseWebhookFormatter {
  formatMessage(message: NotificationMessage): any {
    return {
      title: message.title || 'Notification',
      text: message.body,
      url: message.link,
      imageUrl: message.imageUrl
    };
  }
}
