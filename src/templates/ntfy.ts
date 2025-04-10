/**
 * ntfy-specific template handling
 * This file contains functions for applying templates specifically for ntfy.sh
 */

import { NotificationTemplate, getTemplate } from './notification.js';
import { NotificationMessage } from '../config/types.js';

/**
 * Apply a template to an ntfy notification
 * ntfy supports title and message text with simple replacements
 * 
 * @param templateName The name of the template to apply
 * @param data The data to use for template variables
 * @returns Formatted title and message for ntfy
 */
export function applyNtfyTemplate(
  templateName: string, 
  data: Record<string, any>
): { title: string; message: string } {
  // Get the template
  const template = getTemplate(templateName);
  if (!template) {
    throw new Error(`Template not found: ${templateName}`);
  }

  // Apply simple variable replacements for ntfy ({{.variable}} format)
  return {
    title: applyNtfyVariables(template.title, data),
    message: applyNtfyVariables(template.message, data)
  };
}

/**
 * Apply variable replacements to a string in ntfy format
 * Supports the {{.variable}} syntax used by Go templates
 * 
 * @param text The text containing variables to replace
 * @param data The data object containing variable values
 * @returns The text with variables replaced
 */
function applyNtfyVariables(text: string, data: Record<string, any>): string {
  return text.replace(/{{\.([^}]+)}}/g, (match, key) => {
    // Handle conditional sections with if statements
    if (key.startsWith('if ')) {
      const condition = key.substring(3).trim();
      return data[condition] ? '' : match;
    }
    
    // Handle end of conditional sections
    if (key === 'end') {
      return '';
    }

    // Regular variable replacement
    const value = getNestedValue(data, key);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get a nested value from an object using a dot-notation path
 * 
 * @param obj The object to extract the value from
 * @param path The path to the value in dot notation
 * @returns The value at the path, or undefined if not found
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * Enhance a notification message with template data
 * 
 * @param message The original notification message
 * @param templateName The name of the template to apply
 * @param templateData The data to use for the template
 * @returns Enhanced notification message with template applied
 */
export function enhanceWithTemplate(
  message: NotificationMessage,
  templateName: string,
  templateData: Record<string, any>
): NotificationMessage {
  const applied = applyNtfyTemplate(templateName, templateData);
  
  return {
    ...message,
    title: applied.title,
    body: applied.message
  };
} 