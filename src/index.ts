#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport, } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config/index.js";
import { NotificationMessage } from "./config/types.js";
import { WebhookFormatterFactory } from "./webhooks/index.js";
import { ImgurUploader } from "./utils/imgur.js";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { listTemplateNames } from './templates/notification.js';

// Get package.json version
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Load configuration
const config = loadConfig();

// Validate configuration
if (!config.webhook.url) {
  console.error("Error: No webhook URL configured. Please set WEBHOOK_URL environment variable or create a config file.");
  process.exit(1);
}

// Create Imgur uploader if configured
const imgurUploader = config.imgur ? new ImgurUploader(config.imgur) : undefined;

// Create webhook formatter
const webhookFormatter = WebhookFormatterFactory.createFormatter(config.webhook);

// Create MCP server
const server = new McpServer({
  name: "mcp-server-notifier",
  version: packageJson.version
});

// Get list of template names
const templateNames = listTemplateNames();
const templateEnum = templateNames.length > 0 
  ? z.union([z.enum(templateNames as [string, ...string[]]), z.undefined()])
  : z.undefined();

// Provider-agnostic notification tool
server.tool(
  "notify",
  "Send a notification to configured webhook services (Discord, Slack, Teams, Feishu, ntfy, custom)",
  {
    message: z.string().describe("The main content of the notification message"),
    title: z.string().optional().describe("Optional title for the notification"),
    link: z.string().url().optional().describe("Optional URL to include in the notification"),
    imageUrl: z.string().url().optional().describe("URL of an image to include (will be used as an attachment when possible)"),
    image: z.string().optional().describe("Local file path for an image to upload to Imgur"),
    priority: z.number().int().min(1).max(5).optional().describe("Notification priority level from 1-5 (5=highest)"),
    attachments: z.array(z.string().url()).optional().describe("List of URLs to attach to the notification"),
    template: templateEnum.optional().describe(`Use a predefined notification template: ${templateNames.join(", ") || "none available"}`),
    templateData: z.record(z.any()).optional().describe("Data to use with the selected template"),
    actions: z.array(z.object({
      action: z.enum(['view', 'http']).describe("Type of action: 'view' opens URL, 'http' makes a request"),
      label: z.string().describe("Text label for the action button"),
      url: z.string().url().describe("URL to open or send request to"),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).optional().describe("HTTP method for http action type"),
      headers: z.record(z.string()).optional().describe("Custom headers for http action"),
      body: z.string().optional().describe("Request body for http action"),
      clear: z.boolean().optional().describe("Whether to clear notification after action")
    })).optional().describe("Interactive action buttons for the notification")
  },
  async ({ 
    message, 
    title, 
    link, 
    imageUrl, 
    image, 
    priority, 
    attachments,
    template,
    templateData,
    actions 
  }) => {
    // Handle image upload to Imgur if provided and Imgur is configured
    let finalImageUrl = imageUrl; // Use legacy imageUrl if provided
    
    if (imgurUploader) {
      // If local image file path is provided, prioritize it
      if (image) {
        try {
          if (fs.existsSync(image)) {
            finalImageUrl = await imgurUploader.uploadImageFromFile(image);
          } else {
            console.error(`Image file not found: ${image}`);
            finalImageUrl = undefined; // Don't use if file not found
          }
        } catch (error) {
          console.error("Failed to upload image file to Imgur:", error);
          finalImageUrl = undefined; // Don't use if upload failed
        }
      } 
      // If only remote imageUrl is provided, upload that to Imgur
      else if (imageUrl) {
        try {
          finalImageUrl = await imgurUploader.uploadImage(imageUrl);
        } catch (error) {
          console.error("Failed to upload image URL to Imgur:", error);
          finalImageUrl = undefined; // Don't use if upload failed
        }
      }
    }

    // Construct the notification message object
    const notificationMessage: NotificationMessage = {
      title,
      body: message,
      link,
      imageUrl: finalImageUrl, 
      priority,
      attachments,
      template,
      templateData,
      actions
    };

    // Send webhook using the formatter's prepareRequest method
    const request = webhookFormatter.prepareRequest(notificationMessage);
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    const data = await response.text();
    return {
      content: [{ type: "text", text: data }]
    };
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
