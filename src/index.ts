#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport, } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { loadConfig } from "./config/index.js";
import { NotificationMessage } from "./config/types.js";
import { WebhookFormatterFactory } from "./webhooks/index.js";
import { ImgurUploader } from "./utils/imgur.js";

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
  version: "1.0.5"
});

// Legacy tool for backward compatibility
server.tool(
  "notify-feishu",
  { message: z.string() },
  async ({ message }) => {
    const response = await fetch(config.webhook.url, {
      method: 'POST',
      headers: webhookFormatter.formatHeaders(),
      body: JSON.stringify(webhookFormatter.formatMessage({ body: message }))
    });
    const data = await response.text();
    return {
      content: [{ type: "text", text: data }]
    };
  }
);

// New generic notification tool with more options
server.tool(
  "notify",
  {
    message: z.string(),
    title: z.string().optional(),
    link: z.string().url().optional(),
    imageUrl: z.string().url().optional()
  },
  async ({ message, title, link, imageUrl }) => {
    // Handle image upload to Imgur if provided and Imgur is configured
    let finalImageUrl = imageUrl;
    if (imageUrl && imgurUploader) {
      try {
        finalImageUrl = await imgurUploader.uploadImage(imageUrl);
      } catch (error) {
        console.error("Failed to upload image to Imgur:", error);
      }
    }

    // Create notification message
    const notificationMessage: NotificationMessage = {
      title,
      body: message,
      link,
      imageUrl: finalImageUrl
    };

    // Send webhook
    const response = await fetch(config.webhook.url, {
      method: 'POST',
      headers: webhookFormatter.formatHeaders(),
      body: JSON.stringify(webhookFormatter.formatMessage(notificationMessage))
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
