import { BaseWebhookFormatter } from './base.js';
/**
 * Formatter for Slack webhooks
 */
export class SlackWebhookFormatter extends BaseWebhookFormatter {
    formatMessage(message) {
        const blocks = [];
        // Add title section if provided
        if (message.title) {
            blocks.push({
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: message.title,
                    emoji: true
                }
            });
        }
        // Add message body
        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: message.body
            }
        });
        // Add link if provided
        if (message.link) {
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `<${message.link}|Open Link>`
                }
            });
        }
        // Add image if provided
        if (message.imageUrl) {
            blocks.push({
                type: 'image',
                image_url: message.imageUrl,
                alt_text: 'Notification image'
            });
        }
        return {
            blocks: blocks
        };
    }
}
