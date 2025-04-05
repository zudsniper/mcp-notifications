import { NotificationMessage } from '../config/types.js';
import { BaseWebhookFormatter } from './base.js';

/**
 * Formatter for Feishu (飞书) webhooks
 */
export class FeishuWebhookFormatter extends BaseWebhookFormatter {
  formatMessage(message: NotificationMessage): any {
    // Simple text message
    if (!message.title && !message.imageUrl && !message.link) {
      return {
        msg_type: 'text',
        content: {
          text: message.body
        }
      };
    }

    // Rich text message with optional image and link
    const content = [
      {
        tag: 'text',
        text: message.body
      }
    ];

    // Add link if provided
    if (message.link) {
      content.push({
        tag: 'a',
        text: 'Open Link',
        href: message.link
      });
    }

    // Build the post format
    const post = {
      zh_cn: {
        title: message.title || 'Notification',
        content: [content]
      }
    };

    // If image is provided, add it as a separate image message
    // Feishu's API has limitations with inline images in the post format
    if (message.imageUrl) {
      return {
        msg_type: 'post',
        content: {
          post: post,
          image_key: message.imageUrl // Note: This isn't standard Feishu format
                                      // Feishu requires pre-uploaded images with image_key
                                      // This is a placeholder for demonstration
        }
      };
    }

    return {
      msg_type: 'post',
      content: {
        post: post
      }
    };
  }
}
