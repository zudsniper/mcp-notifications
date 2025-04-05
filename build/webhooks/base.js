/**
 * Abstract base class for webhook formatters
 */
export class BaseWebhookFormatter {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Get HTTP headers for the webhook request
     */
    formatHeaders() {
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
    formatMessage(message) {
        return {
            title: message.title || 'Notification',
            text: message.body,
            url: message.link,
            imageUrl: message.imageUrl
        };
    }
}
