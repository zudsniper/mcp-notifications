import { NotificationMessage, MessageAction } from '../config/types.js';
import { BaseWebhookFormatter } from './base.js';
import { getTemplate } from '../templates/notification.js';
import { WebhookConfig } from '../config/types.js';

/**
 * Slack color constants
 */
enum SlackColors {
  DEFAULT = '#0099FF', // Blue color
  SUCCESS = '#2EB67D', // Green
  WARNING = '#E1E44D', // Yellow
  ERROR = '#E01E5A',   // Red
  INFO = '#4A154B',    // Purple
}

/**
 * Template to color mapping for predefined templates
 */
const TEMPLATE_COLORS: Record<string, string> = {
  status: SlackColors.INFO,
  progress: SlackColors.SUCCESS,
  question: SlackColors.WARNING,
  problem: SlackColors.ERROR,
};

/**
 * Formatter for Slack webhooks
 */
export class SlackWebhookFormatter extends BaseWebhookFormatter {

  constructor(config: WebhookConfig) {
    super(config);
  }

  formatMessage(message: NotificationMessage): any {
    let payload: any = {};
    const blocks: any[] = [];
    const attachments: any[] = [{
      blocks: [],
      color: SlackColors.DEFAULT
    }];

    // Set the main text of the notification as a fallback for older clients
    payload.text = message.title || message.body;

    // Handle templates if specified
    if (message.template && message.templateData) {
      const template = getTemplate(message.template);
      if (template) {
        const templatedTitle = this.applySimpleTemplateVars(template.title, message.templateData);
        const templatedBody = this.applySimpleTemplateVars(template.message, message.templateData);

        this.buildBaseMessage({ ...message, title: templatedTitle, body: templatedBody }, blocks, attachments, message.templateData);
        this.applyTemplateFormatting(attachments[0].blocks, message.template, message.templateData);
      } else {
        console.warn(`Template not found: ${message.template}, using default formatting`);
        this.buildBaseMessage(message, blocks, attachments, message.templateData);
      }
    } else {
      this.buildBaseMessage(message, blocks, attachments);
    }

    // Determine Color: Template > Priority > Default
    if (message.template && TEMPLATE_COLORS[message.template]) {
      attachments[0].color = TEMPLATE_COLORS[message.template];
    } else if (message.priority) {
      switch (message.priority) {
        case 5: attachments[0].color = SlackColors.ERROR; break;
        case 4: attachments[0].color = SlackColors.WARNING; break;
        case 3: attachments[0].color = SlackColors.INFO; break;
        case 2: attachments[0].color = SlackColors.DEFAULT; break;
        case 1: attachments[0].color = SlackColors.SUCCESS; break;
        default: attachments[0].color = SlackColors.DEFAULT;
      }
    }

    // Add actions if provided
    if (message.actions && message.actions.length > 0) {
      blocks.push(this.createActionsBlock(message.actions));
    }

    payload.blocks = blocks;
    payload.attachments = attachments;

    // Add username and icon from config if they exist
    if (this.config.username) {
      payload.username = this.config.username;
    }
    if (this.config.avatarUrl) {
      payload.icon_url = this.config.avatarUrl;
    }

    return payload;
  }

  private buildBaseMessage(message: NotificationMessage, blocks: any[], attachments: any[], templateData?: Record<string, any>): void {
    // Add title
    if (message.title) {
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: message.title.substring(0, 150), // Max 150 chars for header
          emoji: true
        }
      });
    }

    // Add body
    let bodyText = message.body || '...';
    if (templateData?.pingRoleId) {
      // Slack uses `<!subteam^ID>` for user groups or `<!here>`/`<!channel>`
      bodyText = `<!subteam^${templateData.pingRoleId}> ${bodyText}`;
    }
    attachments[0].blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: bodyText.substring(0, 3000) // Max 3000 chars for section
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

    // Add attachments as fields
    if (message.attachments && message.attachments.length > 0) {
      const fields = message.attachments.map((url, index) => `*Attachment ${index + 1}:* <${url}>`).join('\n');
      attachments[0].blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: fields
        }
      });
    }
  }

  private applyTemplateFormatting(blocks: any[], templateName: string, templateData: Record<string, any>): void {
    switch (templateName) {
      case 'status':
        if (templateData.status) {
          const statusIcon = this.getStatusIcon(templateData.status);
          blocks.push({
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `${statusIcon} *Status:* ${templateData.status}` }
            ]
          });
        }
        break;

      case 'progress':
        let percent = -1;
        if (templateData.percentage !== undefined) {
          percent = Number(templateData.percentage);
        } else if (templateData.current !== undefined && templateData.total !== undefined) {
          percent = Math.round((Number(templateData.current) / Number(templateData.total)) * 100);
        }

        if (percent >= 0 && percent <= 100) {
          const progressBar = this.createProgressBar(percent);
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Progress:*\n${progressBar}`
            }
          });
        }
        if (templateData.eta) {
          blocks.push({
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `*ETA:* ${String(templateData.eta)}` }
            ]
          });
        }
        break;

      case 'problem':
        if (templateData.error) {
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Error Details:*\n\`\`\`${String(templateData.error).substring(0, 2900)}\`\`\``
            }
          });
        }
        if (templateData.severity) {
          blocks.push({
            type: 'context',
            elements: [
              { type: 'mrkdwn', text: `*Severity:* ${String(templateData.severity)}` }
            ]
          });
        }
        break;

      case 'question':
        if (templateData.options && Array.isArray(templateData.options)) {
          const optionsText = templateData.options.map((opt: any, i: number) => `${i + 1}. ${String(opt)}`).join('\n');
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Options:*\n${optionsText}`
            }
          });
        }
        break;
    }
  }

  private createActionsBlock(actions: MessageAction[]): any {
    const elements = actions.map(action => {
      if (action.action === 'view') {
        return {
          type: 'button',
          text: {
            type: 'plain_text',
            text: action.label.substring(0, 75),
            emoji: true
          },
          url: action.url,
          action_id: `view_${Math.random().toString(36).substring(7)}`
        };
      }
      // Note: Slack's 'http' actions from webhooks are not supported in the same way as Discord.
      // We can only create URL buttons. We will treat 'http' as 'view'.
      return {
        type: 'button',
        text: {
          type: 'plain_text',
          text: action.label.substring(0, 75),
          emoji: true
        },
        url: action.url,
        action_id: `http_${Math.random().toString(36).substring(7)}`
      };
    }).filter(el => el !== null);

    if (elements.length > 0) {
      return {
        type: 'actions',
        elements: elements.slice(0, 5) // Slack allows max 5 buttons in an action block
      };
    }
    return null;
  }

  private applySimpleTemplateVars(template: string | undefined, data: Record<string, any>): string {
    if (!template) return '';

    let result = template;

    const matches = template.match(/{{\.([a-zA-Z0-9_]+)}}/g);
    if (matches) {
      matches.forEach(match => {
        const varName = match.replace("{{.", "").replace("}}", "");
        if (data[varName] !== undefined) {
          result = result.replace(match, String(data[varName]));
        } else {
          result = result.replace(match, "");
        }
      });
    }

    const ifMatches = result.match(/{{if \.[a-zA-Z0-9_]+}}(.*?){{end}}/gs);
    if (ifMatches) {
      ifMatches.forEach(match => {
        const condVarMatch = match.match(/{{if \.([a-zA-Z0-9_]+)}}/);
        if (condVarMatch && condVarMatch[1]) {
          const varName = condVarMatch[1];
          const content = match.replace(/{{if \.[a-zA-Z0-9_]+}}/, "").replace(/{{end}}/, "");

          if (data[varName]) {
            result = result.replace(match, content);
          } else {
            result = result.replace(match, "");
          }
        }
      });
    }

    return result.trim();
  }

  private getStatusIcon(status: string): string {
    status = status.toLowerCase();
    if (status.includes('success') || status.includes('complete') || status.includes('ok')) return '✅';
    if (status.includes('warn') || status.includes('pending')) return '⚠️';
    if (status.includes('error') || status.includes('fail')) return '❌';
    if (status.includes('info') || status.includes('running')) return 'ℹ️';
    return '🔔';
  }

  private createProgressBar(percentage: number): string {
    const fullBlocks = Math.floor(percentage / 10);
    const emptyBlocks = 10 - fullBlocks;
    return `[${'█'.repeat(fullBlocks)}${' '.repeat(emptyBlocks)}] ${percentage}%`;
  }
}
