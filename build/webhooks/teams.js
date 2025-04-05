import { BaseWebhookFormatter } from './base.js';
/**
 * Formatter for Microsoft Teams webhooks
 */
export class TeamsWebhookFormatter extends BaseWebhookFormatter {
    formatMessage(message) {
        const sections = [];
        // Add message body
        sections.push({
            activityTitle: message.title || 'Notification',
            activitySubtitle: '',
            text: message.body
        });
        // Add image if provided
        if (message.imageUrl) {
            sections[0].activityImage = message.imageUrl;
        }
        // Add link if provided
        const potentialActions = [];
        if (message.link) {
            potentialActions.push({
                '@type': 'OpenUri',
                name: 'Open Link',
                targets: [
                    {
                        os: 'default',
                        uri: message.link
                    }
                ]
            });
        }
        return {
            '@type': 'MessageCard',
            '@context': 'http://schema.org/extensions',
            themeColor: '0076D7',
            summary: message.title || 'Notification',
            sections: sections,
            potentialAction: potentialActions.length > 0 ? potentialActions : undefined
        };
    }
}
