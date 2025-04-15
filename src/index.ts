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
import { startServer, askQuestion, getQuestionUrl } from './server/ask/index.js';

// Get package.json version
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Check for --version flag
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log(packageJson.version);
  process.exit(0);
}

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

// Helper function to send the notification
async function sendNotification(notificationMessage: NotificationMessage): Promise<{ content: { type: "text"; text: string }[] }> {
  const request = webhookFormatter.prepareRequest(notificationMessage);
  let response: Response;
  try {
    response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
  } catch (error: any) {
    console.error("Failed to send notification:", error);
    return {
      content: [{ type: "text", text: `Failed to send notification: Network error - ${error.message}` }]
    };
  }

  const data = await response.text();

  if (response.ok) {
    return {
      content: [{ type: "text", text: `Notification sent successfully (Status: ${response.status}). Response: ${data}` }]
    };
  } else {
    console.error(`Failed to send notification (Status: ${response.status}): ${data}`);
    return {
      content: [{ type: "text", text: `Failed to send notification (Status: ${response.status}). Response: ${data}` }]
    };
  }
}

// Get list of template names
const templateNames = listTemplateNames();
const templateEnum = templateNames.length > 0 
  ? z.union([z.enum(templateNames as [string, ...string[]]), z.undefined()])
  : z.undefined();

// Start the ask server if enabled
if (config.ask?.enabled) {
  startServer(config.ask.port)
    .then(() => console.log(`Ask server started on port ${config.ask!.port}`))
    .catch(error => console.error('Failed to start ask server:', error));
}

// Ask question tool
if (config.ask?.enabled) {
  server.tool(
    "ask_question",
    "Ask a question via a web UI and wait for an answer with a timeout",
    {
      question: z.string().describe("The question to ask"),
      title: z.string().optional().describe("Optional title for the question"),
      timeout: z.number().int().min(10).max(3600).describe("Timeout in seconds (10-3600)")
    },
    async ({ question, title, timeout }) => {
      try {
        // Start asking the question
        console.log(`Asking question: ${title || 'Untitled'}`);
        
        // Generate a question and get the promise for the answer
        const { questionId, answerPromise } = askQuestion(question, title, timeout);
        
        // Generate the URL for the question
        const questionUrl = getQuestionUrl(questionId, config.ask!.serverUrl, config.ask!.port);
        
        console.log(`Question URL: ${questionUrl}`);
        
        // Send notification about the new question
        if (config.webhook?.url) {
          const notificationMessage: NotificationMessage = {
            title: `Question: ${title || 'Untitled'}`,
            body: `New question: ${question}\n\nReply at: ${questionUrl}`,
            link: questionUrl,
            template: 'question'
          };
          
          // Send the notification asynchronously - don't await
          sendNotification(notificationMessage)
            .catch(error => console.error('Failed to send question notification:', error));
        }
        
        // Wait for an answer with timeout
        const answer = await answerPromise;
        
        console.log(`Answer received for: ${title || 'Untitled'}`);
        
        return {
          content: [
            { type: "text", text: `Answer received: ${answer}` }
          ]
        };
      } catch (error: any) {
        console.error('Error in ask_question:', error);
        return {
          content: [{ type: "text", text: `Failed to get an answer: ${error.message}` }]
        };
      }
    }
  );
}

// Simplified notification tool
server.tool(
  "notify",
  "Send a simple notification with body, optional title, and optional template (e.g., 'status', 'question', 'progress', 'problem')",
  {
    body: z.string().describe("The main content of the notification message"),
    title: z.string().optional().describe("Optional title for the notification"),
    template: templateEnum.describe("Optional predefined template to use (e.g., 'status', 'question', 'progress', 'problem')"),
  },
  async ({ body, title, template }) => {
    // Default to 'status' template if template is requested but not specified
    // Note: If templateData existed here, we might default, but it doesn't.
    const finalTemplate = template === undefined ? 'status' : template;

    const notificationMessage: NotificationMessage = {
      title,
      body,
      template: finalTemplate,
    };

    return sendNotification(notificationMessage);
  }
);

// Full-featured notification tool
server.tool(
  "full_notify",
  "Send a detailed notification with advanced options (link, image, priority, attachments, actions, template data)",
  {
    body: z.string().describe("The main content of the notification message"), // Renamed from message
    title: z.string().optional().describe("Optional title for the notification"),
    link: z.string().url().optional().describe("Optional URL to include in the notification"),
    imageUrl: z.string().url().optional().describe("URL of an image to include (will be uploaded to Imgur if configured)"),
    image: z.string().optional().describe("Local file path for an image to upload to Imgur (prioritized over imageUrl)"),
    priority: z.number().int().min(1).max(5).optional().describe("Notification priority level from 1-5 (5=highest)"),
    attachments: z.array(z.string().url()).optional().describe("List of URLs to attach to the notification"),
    template: templateEnum.describe("Predefined template to use (e.g., 'status', 'question', 'progress', 'problem')"),
    templateData: z.record(z.any()).optional().describe("Data to be used with the selected template"),
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
    body, // Renamed from message
    title,
    link,
    imageUrl,
    image,
    priority,
    attachments,
    actions,
    template,
    templateData
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

    // Default to 'status' template if template is requested but not specified
    const finalTemplate = template === undefined && templateData ? 'status' : template;

    // Construct the notification message object
    const notificationMessage: NotificationMessage = {
      title,
      body: body, // Use renamed 'body'
      link,
      imageUrl: finalImageUrl,
      priority,
      attachments,
      actions,
      template: finalTemplate,
      templateData
    };

    // Send webhook using the helper function
    return sendNotification(notificationMessage);
  }
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
