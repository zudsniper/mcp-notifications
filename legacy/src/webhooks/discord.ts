import { NotificationMessage } from '../config/types.js';
import { BaseWebhookFormatter } from './base.js';
import { getTemplate } from '../templates/notification.js';
import { WebhookConfig } from '../config/types.js';

/**
 * Discord color constants
 */
enum DiscordColors {
  DEFAULT = 0x0099FF, // Blue color
  SUCCESS = 0x57F287, // Green
  WARNING = 0xFEE75C, // Yellow
  ERROR = 0xED4245,   // Red
  INFO = 0x5865F2,    // Purple
}

/**
 * Template to color mapping for predefined templates
 */
const TEMPLATE_COLORS: Record<string, number> = {
  status: DiscordColors.INFO,
  progress: DiscordColors.SUCCESS,
  question: DiscordColors.WARNING,
  problem: DiscordColors.ERROR,
};

// Helper to create fields safely
const createField = (name: string, value: string, inline: boolean = false): { name: string; value: string; inline: boolean } | null => {
  if (!name || !value) return null;
  // Discord field values have a 1024 char limit
  return { name: name.substring(0, 256), value: value.substring(0, 1024), inline };
};

/**
 * Formatter for Discord webhooks
 */
export class DiscordWebhookFormatter extends BaseWebhookFormatter {
  
  // Override constructor to store config if needed later (e.g., for footer text)
  constructor(config: WebhookConfig) {
    super(config);
  }
  
  formatMessage(message: NotificationMessage): any {
    let embed: any;

    // Handle templates if specified
    if (message.template && message.templateData) {
      const template = getTemplate(message.template);
      if (template) {
        // Apply simple template vars first
        const templatedTitle = this.applySimpleTemplateVars(template.title, message.templateData);
        const templatedBody = this.applySimpleTemplateVars(template.message, message.templateData);
        
        // Create base embed with potentially templated title/body
        embed = this.createBaseEmbed({
          ...message,
          title: templatedTitle,
          body: templatedBody,
        }, message.templateData);

        // Apply template-specific modifications
        embed = this.applyTemplateFormatting(embed, message.template, message.templateData);

      } else {
        console.warn(`Template not found: ${message.template}, using default formatting`);
        // Fallback to default embed if template not found
        embed = this.createBaseEmbed(message, message.templateData);
      }
    } else {
      // Create default embed if no template specified
      embed = this.createBaseEmbed(message);
    }

    // Construct the final payload
    const payload: any = {
      embeds: [embed]
    };
    
    // Add username and avatar_url from config if they exist
    if (this.config.username) {
      payload.username = this.config.username;
    }
    if (this.config.avatarUrl) {
      payload.avatar_url = this.config.avatarUrl;
    }

    return payload;
  }

  /**
   * Create a base Discord embed from a notification message and optional template data
   */
  private createBaseEmbed(message: NotificationMessage, templateData?: Record<string, any>): any {
    const embed: any = {
      title: message.title?.substring(0, 256) || 'Notification', // Max 256 chars
      description: message.body?.substring(0, 4096) || '...', // Max 4096 chars
      timestamp: new Date().toISOString(),
      fields: []
    };

    // Prepend role ping if provided in templateData
    if (templateData?.pingRoleId) {
      embed.description = `<@&${templateData.pingRoleId}> ${embed.description}`.substring(0, 4096);
    }

    // Set URL if provided
    if (message.link) {
      embed.url = message.link;
    }

    // Determine Color: Template > Priority > Default
    if (message.template && TEMPLATE_COLORS[message.template]) {
      embed.color = TEMPLATE_COLORS[message.template];
    } else if (message.priority) {
       switch (message.priority) {
        case 5: embed.color = DiscordColors.ERROR; break;
        case 4: embed.color = DiscordColors.WARNING; break;
        case 3: embed.color = DiscordColors.INFO; break;
        case 2: embed.color = DiscordColors.DEFAULT; break; // Or INFO? Default seems less useful
        case 1: embed.color = DiscordColors.SUCCESS; break; // Lowest priority = success? Maybe DEFAULT?
        default: embed.color = DiscordColors.DEFAULT;
      }
    } else {
       embed.color = DiscordColors.DEFAULT;
    }

    // Add Author if provided in templateData
    if (templateData?.authorName) {
      embed.author = {
        name: templateData.authorName.substring(0, 256), // Max 256 chars
        url: templateData.authorUrl,
        icon_url: templateData.authorIconUrl
      };
    }

    // Add Thumbnail if provided in templateData
    if (templateData?.thumbnailUrl) {
      embed.thumbnail = {
        url: templateData.thumbnailUrl
      };
    }
    
    // Add Image if provided in the main message
    if (message.imageUrl) {
      embed.image = {
        url: message.imageUrl
      };
    }

    // Add Footer
    embed.footer = {
      text: (this.config.name || 'MCP Server Notifier').substring(0, 2048), // Max 2048 chars
      // icon_url: optional footer icon?
    };

    // Add Attachments as fields
    if (message.attachments && message.attachments.length > 0) {
       message.attachments.forEach((url, index) => {
         const field = createField(`Attachment ${index + 1}`, url);
         if (field) embed.fields.push(field);
       });
    }
    
    // Add Actions as fields (Discord doesn't support buttons in webhooks directly)
    if (message.actions && message.actions.length > 0) {
      message.actions.forEach((action, index) => {
        const field = createField(action.label, `[${action.action === 'view' ? 'Open Link' : 'Trigger Action'}](${action.url})`, true);
         if (field) embed.fields.push(field);
      });
    }
    
    // Remove empty fields array if necessary
    if (embed.fields.length === 0) {
      delete embed.fields;
    }

    return embed;
  }

  /**
   * Apply template-specific formatting modifications to an existing embed
   */
  private applyTemplateFormatting(
    embed: any,
    templateName: string,
    templateData: Record<string, any>
  ): any {
    // Ensure fields array exists
    embed.fields = embed.fields || [];

    switch (templateName) {
      case 'status':
        if (templateData.status) {
          const statusIcon = this.getStatusIcon(templateData.status);
          // Option 1: Prepend icon to title
          // embed.title = `${statusIcon} ${embed.title}`.substring(0, 256); 
          // Option 2: Add as a field
           const field = createField("Status", `${statusIcon} ${templateData.status}`, true);
           if (field) embed.fields.unshift(field); // Add to beginning
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
          // Option 1: Append to description
          // embed.description = `${embed.description}\\n\\n${progressBar}`.substring(0, 4096);
          // Option 2: Add as a field
          const field = createField("Progress", progressBar);
          if (field) embed.fields.push(field);
        }
        if (templateData.eta) {
           const field = createField("ETA", String(templateData.eta), true);
           if (field) embed.fields.push(field);
        }
        break;

      case 'problem':
         // Prepend icon to title
         embed.title = `⚠️ ${embed.title}`.substring(0, 256);
         if (templateData.error) {
           const field = createField("Error Details", `\`\`\`${String(templateData.error).substring(0, 1000)}\`\`\``); // Limit error log size
           if (field) embed.fields.push(field);
         }
         if (templateData.severity) {
           const field = createField("Severity", String(templateData.severity), true);
           if (field) embed.fields.push(field);
         }
        break;

      case 'question':
        // Prepend icon to title
        embed.title = `❓ ${embed.title}`.substring(0, 256);
        // Potentially add fields for options if provided in templateData
        if (templateData.options && Array.isArray(templateData.options)) {
           templateData.options.forEach((option: any, index: number) => {
             const field = createField(`Option ${index + 1}`, String(option));
             if (field) embed.fields.push(field);
           });
        }
        break;
    }
    
    // Remove empty fields array if necessary
    if (embed.fields.length === 0) {
      delete embed.fields;
    } else {
      // Ensure we don't exceed 25 fields
      embed.fields = embed.fields.slice(0, 25);
    }

    return embed;
  }

  /**
   * Format a message using a predefined template - **DEPRECATED METHOD (logic moved)**
   * Kept temporarily to avoid breaking changes if called directly, though it shouldn't be.
   */
  private formatTemplatedMessage(
    message: NotificationMessage,
    templateName: string,
    templateData: Record<string, any>
  ): any {
     console.warn("Direct call to formatTemplatedMessage is deprecated. Logic moved to formatMessage.");
     // Replicate the logic now within formatMessage
     const template = getTemplate(templateName);
     if (!template) {
       console.warn(`Template not found: ${templateName}, using default formatting`);
       return { embeds: [this.createBaseEmbed(message)] };
     }
     
     const templatedTitle = this.applySimpleTemplateVars(template.title, templateData);
     const templatedBody = this.applySimpleTemplateVars(template.message, templateData);
     
     let embed = this.createBaseEmbed({
       ...message,
       title: templatedTitle,
       body: templatedBody,
     }, templateData);

     embed = this.applyTemplateFormatting(embed, templateName, templateData);
     
     return { embeds: [embed] };
  }

  /**
   * Apply simple variable replacements to a template string
   * This is a simplified version of template parsing for Discord
   */
  private applySimpleTemplateVars(template: string | undefined, data: Record<string, any>): string {
    if (!template) return '';
    
    let result = template;
    
    // Replace {{.var}} syntax with values
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
    
    // Handle simple if conditions {{if .var}}content{{end}}
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
  
  /**
   * Get an appropriate emoji for a status
   */
  private getStatusIcon(status: string): string {
    status = status.toLowerCase();
    
    if (status.includes('success') || status.includes('complete') || status.includes('ok')) {
      return '✅';
    } else if (status.includes('warn') || status.includes('pending')) {
      return '⚠️';
    } else if (status.includes('error') || status.includes('fail')) {
      return '❌';
    } else if (status.includes('info') || status.includes('running')) {
      return 'ℹ️';
    }
    
    return '🔔'; // Default
  }
  
  /**
   * Create a visual progress bar using block characters
   */
  private createProgressBar(percentage: number): string {
    const fullBlocks = Math.floor(percentage / 10);
    const emptyBlocks = 10 - fullBlocks;
    
    return `[${'█'.repeat(fullBlocks)}${' '.repeat(emptyBlocks)}] ${percentage}%`;
  }
}
