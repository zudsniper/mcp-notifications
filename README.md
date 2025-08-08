# MCP Notifications

> This project is a spiritual successor to the original `mcp-server-notifier` by [tuberrabbit@gmail.com](mailto:tuberrabbit@gmail.com), and has been significantly rewritten and is now maintained by [zudsniper](https://github.com/zudsniper).

A lightweight notification service that integrates with MCP (Model Context Protocol) to send webhooks when AI agents complete tasks.

[简体中文文档](./docs/README_zh.md)

![MCP Notifications](./docs/images/banner.png)

## Features

- **Webhook Notifications**: Receive alerts when your AI agents complete tasks
- **Multiple Webhook Providers**: Support for Discord, Slack, Microsoft Teams, Feishu, Ntfy, and custom webhooks
- **Image Support**: Include images in notifications via Imgur
- **Multi-Project Support**: Efficiently manage notifications across different projects
- **Easy Integration**: Simple setup with AI tools like Cursor
- **Customizable Messages**: Send personalized notifications with title, body, and links
- **Discord Embed Support**: Send rich, customizable Discord embed notifications
- **NTFY Template Support**: Use pre-defined templates for status, questions, progress, and problems.
- **Discord Webhook Example**: Now includes a sample Discord webhook config (`discord_webhook.json`) and test script (`src/test-discord.js`)
- **ntfy Webhook Example**: Includes a sample ntfy config (`ntfy-webhook.json`) and test script (`src/test-ntfy.js`)
- **Improved Discord/NTFY Logic**: Enhanced webhook handling and configuration types

## Installation

### Option 1: Using npm

```bash
npm install -g mcp-notifications
```

### Option 2: Using Docker

The Docker image name is not yet updated, but you can pull the latest version of the old image for now.

```bash
docker pull zudsniper/mcp-server-notifier:latest

# Run with environment variables
docker run -e WEBHOOK_URL=https://your-webhook-url -e WEBHOOK_TYPE=discord zudsniper/mcp-server-notifier
```

### Option 3: From Source

```bash
git clone https://github.com/zudsniper/mcp-server-notifier.git
cd mcp-server-notifier
npm install
npm run build
```

## Integration

### Cursor Integration

1. Go to your 'Cursor Settings'
2. Click `MCP` in the sidebar, then click `+ Add new global MCP server`
3. Add `mcp-notifications`.
```json
{
   "mcpServers": {
      "notifier": {
         "command": "npx",
         "args": [
            "-y",
            "mcp-notifications"
         ],
         "env": {
            "WEBHOOK_URL": "https://ntfy.sh/webhook-url-example",
            "WEBHOOK_TYPE": "ntfy"
         }
      }
   }
}

```

## Configuration

By default, the notifier supports several webhook types:

- Discord
- Slack
- Microsoft Teams
- Feishu
- Ntfy
- Generic JSON

You can specify the webhook type and URL through environment variables:

```bash
env WEBHOOK_URL="https://your-webhook-url" WEBHOOK_TYPE="discord" npx -y mcp-notifications
```
### Authentication Tokens

`WEBHOOK_TOKEN` is an **optional** environment variable. When set, it will be included as a Bearer token in the `Authorization` header **only** for **ntfy** webhook requests. If `WEBHOOK_TOKEN` is not set, no Authorization header is sent.

- **Basic Authentication is not supported.**
- This token is **ignored** by all other webhook providers (Discord, Slack, Teams, Feishu, Generic JSON).

**Example:**

```bash
env WEBHOOK_URL="https://ntfy.sh/your-topic" WEBHOOK_TYPE="ntfy" WEBHOOK_TOKEN="your-secret-token" npx -y mcp-notifications
```

### Configuration File

For more advanced configuration, you can create a `webhook-config.json` file in your current directory or in `~/.config/mcp-notifier/webhook-config.json`:

```json
{
  "webhook": {
    "type": "discord",
    "url": "https://discord.com/api/webhooks/your-webhook-url",
    "name": "My Notifier"
  },
  "imgur": {
    "clientId": "your-imgur-client-id"
  }
}
```

See the [Configuration Guide](./docs/CONFIGURATION.md) for full details and examples.

## Usage

For detailed usage instructions, see the [Usage Guide](./docs/USAGE.md).

### Available Tools

This package provides two tools for sending notifications:

1. `notify` - for simple notifications.
2. `full_notify` - for more advanced notifications with all features.

#### `notify`
Send a simple notification with body, optional title, and optional template.

**Input**:
- `body`: The main content of the notification message.
- `title` (optional): The title for the notification.
- `template` (optional): A predefined template to use (e.g., 'status', 'question', 'progress', 'problem').

**Example**:
```javascript
// AI agent call
await run("notify", {
  title: "Task Completed",
  body: "I have finished the task."
});
```

#### `full_notify`
Send a detailed notification with advanced options like a link, image, priority, attachments, actions, and template data.

**Input**:
- `body`: The main content of the notification message.
- `title` (optional): The title for the notification.
- `link` (optional): A URL to include in the notification.
- `imageUrl` (optional): The URL of an image to include.
- `image` (optional): The local file path for an image to upload to Imgur.
- `priority` (optional, ntfy only): Notification priority level from 1-5 (5 is the highest).
- `attachments` (optional, ntfy only): A list of URLs to attach to the notification.
- `template` (optional): A predefined template to use.
- `templateData` (optional): Data to be used with the selected template.
- `actions` (optional, ntfy only): Interactive action buttons for the notification.

**Example**:
```javascript
// AI agent call
await run("full_notify", {
  title: "Server Alert",
  body: "Disk usage is high!",
  priority: 5,
  actions: [
    {
      action: "view",
      label: "Open Grafana",
      url: "https://grafana.example.com/d/abcdefg"
    }
  ]
});
```

### NTFY Templates

When using ntfy.sh as your webhook provider, you can use the following predefined templates with the `template` and `templateData` parameters:

- `status`: For sending status updates.
- `question`: For asking questions.
- `progress`: For tracking the progress of long-running tasks.
- `problem`: For reporting errors or issues.

See [docs/NOTIFICATIONS.md](./docs/NOTIFICATIONS.md) for more details on templates.

## Development

### Setting Up Development Environment

1. Clone the repository:
```bash
git clone https://github.com/zudsniper/mcp-server-notifier.git
cd mcp-server-notifier
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

### Testing Your Changes

1. Run the MCP server in development mode:
```bash
# Install the MCP Inspector if you haven't already
npm install -g @modelcontextprotocol/inspector

# Start the server with the Inspector
npx @modelcontextprotocol/inspector node build/index.js
```

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
