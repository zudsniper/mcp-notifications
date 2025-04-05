# MCP Server Notifier

A lightweight notification service that integrates with MCP (Model Context Protocol) to send webhooks when AI agents complete tasks. Perfect for developers working across multiple projects who need notifications when background tasks are completed.

## Features

- **Webhook Notifications**: Receive alerts when your AI agents complete tasks
- **Multi-Project Support**: Efficiently manage notifications across different projects
- **Easy Integration**: Simple setup with AI tools like Cursor
- **Customizable Messages**: Send personalized notifications

## Installation

Setup as a BrowserTools MCP Tool:

1. Go to your 'Cursor Settings'
2. Navigate to Features, scroll down to MCP Servers and click on 'Add new MCP server'
   ![MCP Server Setup](/docs/guide.jpg)

3. Configure the server:
   - Name: `mcp-server-notifier` (or any unique name)
   - Type: `command`
   - Command: `env WEBHOOK_URL=[YOUR WEBHOOK URL] WEBHOOK_TYPE=[PROVIDER] npx -y mcp-server-notifier`

   See the [Configuration](#configuration) section for more details on available webhook types.

## Usage

- Ask your AI agent to notify you with a custom message when a task is complete
- Configure it as a persistent rule in Cursor settings to avoid repeating the setup

## Configuration

By default, the notifier supports several webhook types. You can specify the webhook type and URL through environment variables:

```bash
env WEBHOOK_URL="https://your-webhook-url" WEBHOOK_TYPE="discord" npx -y mcp-server-notifier
```

For more advanced configuration, see the [Advanced Configuration](#advanced-configuration) section.

## Internationalization

[简体中文文档](./docs/README_zh.md)
