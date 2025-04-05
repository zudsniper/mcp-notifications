import { WebhookConfig, WebhookType } from '../config/types.js';
import { BaseWebhookFormatter, GenericWebhookFormatter } from './base.js';
import { DiscordWebhookFormatter } from './discord.js';
import { FeishuWebhookFormatter } from './feishu.js';
import { SlackWebhookFormatter } from './slack.js';
import { TeamsWebhookFormatter } from './teams.js';

/**
 * Factory to create appropriate webhook formatter based on the webhook type
 */
export class WebhookFormatterFactory {
  /**
   * Create a webhook formatter for the given configuration
   */
  static createFormatter(config: WebhookConfig): BaseWebhookFormatter {
    switch (config.type) {
      case WebhookType.FEISHU:
        return new FeishuWebhookFormatter(config);
      case WebhookType.DISCORD:
        return new DiscordWebhookFormatter(config);
      case WebhookType.SLACK:
        return new SlackWebhookFormatter(config);
      case WebhookType.TEAMS:
        return new TeamsWebhookFormatter(config);
      case WebhookType.GENERIC:
      case WebhookType.CUSTOM:
      default:
        return new GenericWebhookFormatter(config);
    }
  }
}

export { BaseWebhookFormatter };
