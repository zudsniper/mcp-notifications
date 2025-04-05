import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebhookType } from './types.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/**
 * Load configuration from environment variables and/or JSON file
 */
export function loadConfig() {
    // Default configuration
    const defaultConfig = {
        webhook: {
            type: WebhookType.GENERIC,
            url: '',
        },
    };
    try {
        // Check for config file in current directory
        const configPath = path.resolve(process.cwd(), 'webhook-config.json');
        if (fs.existsSync(configPath)) {
            console.log(`Loading configuration from ${configPath}`);
            const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            return mergeWithEnvVars(fileConfig);
        }
        // Check for config in home directory
        const homeConfigPath = path.resolve(process.env.HOME || process.env.USERPROFILE || '', '.config', 'mcp-notifier', 'webhook-config.json');
        if (fs.existsSync(homeConfigPath)) {
            console.log(`Loading configuration from ${homeConfigPath}`);
            const fileConfig = JSON.parse(fs.readFileSync(homeConfigPath, 'utf8'));
            return mergeWithEnvVars(fileConfig);
        }
    }
    catch (error) {
        console.error('Error loading configuration file:', error);
    }
    // If no config file found, use environment variables
    return loadFromEnv(defaultConfig);
}
/**
 * Load configuration from environment variables
 */
function loadFromEnv(defaultConfig) {
    const config = { ...defaultConfig };
    // Support for legacy FEISHU_WEBHOOK_URL
    if (process.env.FEISHU_WEBHOOK_URL) {
        config.webhook = {
            type: WebhookType.FEISHU,
            url: process.env.FEISHU_WEBHOOK_URL,
        };
        return config;
    }
    // Support for new WEBHOOK_URL and WEBHOOK_TYPE
    if (process.env.WEBHOOK_URL) {
        config.webhook = {
            type: process.env.WEBHOOK_TYPE || WebhookType.GENERIC,
            url: process.env.WEBHOOK_URL,
        };
    }
    // Imgur configuration
    if (process.env.IMGUR_CLIENT_ID) {
        config.imgur = {
            clientId: process.env.IMGUR_CLIENT_ID,
            apiUrl: process.env.IMGUR_API_URL,
        };
    }
    return config;
}
/**
 * Merge configuration from file with environment variables
 * Environment variables take precedence over file configuration
 */
function mergeWithEnvVars(fileConfig) {
    const config = { ...fileConfig };
    // Override webhook URL and type from environment if provided
    if (process.env.WEBHOOK_URL) {
        config.webhook.url = process.env.WEBHOOK_URL;
    }
    if (process.env.WEBHOOK_TYPE) {
        config.webhook.type = process.env.WEBHOOK_TYPE;
    }
    // Support for legacy FEISHU_WEBHOOK_URL
    if (process.env.FEISHU_WEBHOOK_URL) {
        config.webhook = {
            type: WebhookType.FEISHU,
            url: process.env.FEISHU_WEBHOOK_URL,
        };
    }
    // Override Imgur config from environment if provided
    if (!config.imgur) {
        config.imgur = {};
    }
    if (process.env.IMGUR_CLIENT_ID) {
        config.imgur.clientId = process.env.IMGUR_CLIENT_ID;
    }
    if (process.env.IMGUR_API_URL) {
        config.imgur.apiUrl = process.env.IMGUR_API_URL;
    }
    return config;
}
