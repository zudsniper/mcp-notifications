# MCP Notifications

> This project is a spiritual successor to the original `mcp-server-notifier` by [tuberrabbit@gmail.com](mailto:tuberrabbit@gmail.com), and has been significantly rewritten and is now maintained by [zudsniper](https://github.com/zudsniper).

A modern, scalable notification service that integrates with MCP (Model Context Protocol) to send real-time notifications and webhooks when AI agents complete tasks. Now featuring a monorepo architecture with SSE (Server-Sent Events) support, Next.js web interface, and PocketBase integration.

[简体中文文档](./docs/README_zh.md)

![MCP Notifications](./docs/images/banner.png)

## 🚀 What's New in v3.0

- **Monorepo Architecture**: Organized as a workspace with separate apps and packages
- **SSE Server**: Real-time notifications via Server-Sent Events (Cloudflare Worker with Durable Objects)
- **Web Dashboard**: Next.js-based interface for monitoring and managing notifications
- **PocketBase Integration**: Persistent storage for webhooks, connections, and notification history
- **Enhanced Provider Support**: Improved webhook formatting for all major platforms
- **Rate Limiting**: Built-in rate limiting with KV storage
- **Connection Management**: Automatic cleanup and heartbeat for SSE connections
- **TypeScript Throughout**: Full TypeScript support with shared types package

## Features

- **Real-time Notifications**: SSE-based push notifications for instant updates
- **Webhook Notifications**: Receive alerts when your AI agents complete tasks
- **Multiple Webhook Providers**: Support for Discord, Slack, Microsoft Teams, Feishu, Ntfy, and custom webhooks
- **Image Support**: Include images in notifications via Imgur
- **Multi-Project Support**: Efficiently manage notifications across different projects
- **Easy Integration**: Simple setup with AI tools like Cursor
- **Customizable Messages**: Send personalized notifications with title, body, and links
- **Discord Embed Support**: Send rich, customizable Discord embed notifications
- **NTFY Template Support**: Use pre-defined templates for status, questions, progress, and problems
- **Notification History**: Track all notifications with PocketBase storage
- **Fallback Support**: Configure backup webhooks for critical notifications
- **Queue Processing**: Reliable webhook delivery with queue-based processing

## Architecture

The v3.0 architecture consists of multiple components working together:

1. **SSE Server (Cloudflare Worker)**: Manages real-time connections using Durable Objects
2. **Web Dashboard (Next.js)**: User interface for monitoring and configuration
3. **PocketBase**: Persistent storage for webhooks, templates, and history
4. **Queue System**: Reliable webhook delivery with retry logic
5. **Legacy MCP Server**: Backward compatibility for existing integrations

### Data Flow

```
User/AI Agent → SSE Server → Queue → Webhook Provider
                    ↓           ↓
              PocketBase   Rate Limiter
                    ↓
              Web Dashboard
```

## Project Structure

This is a monorepo organized with npm workspaces:

```
mcp-notifications/
├── apps/
│   ├── sse-server/      # Cloudflare Worker for SSE connections
│   └── web/             # Next.js dashboard
├── packages/
│   └── shared/          # Shared types and utilities
├── legacy/              # Legacy MCP server implementation
└── pocketbase/          # PocketBase schema and migrations
```

## Installation

### For Development

```bash
# Clone the repository
git clone https://github.com/zudsniper/mcp-notifications.git
cd mcp-notifications

# Install dependencies for all workspaces
npm install

# Build all packages
npm run build
```

### Deploy SSE Server (Cloudflare Worker)

```bash
cd apps/sse-server
npm run deploy
```

### Run Web Dashboard

```bash
cd apps/web
npm run dev
```

### Legacy MCP Server

The original MCP server is still available in the `legacy/` directory:

```bash
cd legacy
npm install
npm run build
```

## Integration

### SSE Client Integration

Connect to the SSE server from your application:

```javascript
import { SSEClient } from '@mcp-notifications/shared';

const client = new SSEClient({
  userId: 'user-123',
  sseServerUrl: 'https://your-worker.workers.dev',
  onNotification: (notification) => {
    console.log('Received notification:', notification);
  },
  onConnectionStatus: (status) => {
    console.log('Connection status:', status);
  }
});

client.connect();
```

### API Endpoints

Send notifications via the REST API:

```bash
curl -X POST https://your-worker.workers.dev/api/notify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "message": {
      "title": "Task Complete",
      "body": "Your AI agent finished processing"
    },
    "webhookConfig": {
      "type": "discord",
      "url": "https://discord.com/api/webhooks/..."
    }
  }'
```

### Legacy Cursor Integration

For the legacy MCP server:

```json
{
   "mcpServers": {
      "notifier": {
         "command": "node",
         "args": [
            "/path/to/legacy/build/index.js"
         ],
         "env": {
            "WEBHOOK_URL": "https://ntfy.sh/webhook-url-example",
            "WEBHOOK_TYPE": "ntfy"
         }
      }
   }
}

## Configuration

### SSE Server Configuration (Cloudflare Worker)

Configure in `apps/sse-server/wrangler.toml`:

```toml
name = "mcp-notifications-sse"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[durable_objects]
bindings = [{ name = "SSE_CONNECTION_MANAGER", class_name = "SSEConnectionManager" }]

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your-kv-namespace-id"

[[queues.producers]]
binding = "WEBHOOK_QUEUE"
queue = "webhook-notifications"

[vars]
POCKETBASE_URL = "https://your-pocketbase-instance.com"
```

### Web Dashboard Configuration

Configure in `apps/web/.env.local`:

```bash
NEXT_PUBLIC_SSE_SERVER_URL=https://your-worker.workers.dev
NEXT_PUBLIC_POCKETBASE_URL=https://your-pocketbase-instance.com
```

### PocketBase Setup

1. Deploy PocketBase instance
2. Import schema: `pocketbase/pb_schema.json`
3. Run migrations for initial templates

### Supported Webhook Types

- **Discord**: Rich embeds with colors and fields
- **Slack**: Blocks and attachments  
- **Microsoft Teams**: Adaptive cards
- **Feishu**: Interactive cards
- **Ntfy**: Priority levels and actions
- **Generic JSON**: Custom webhook format

### Legacy Configuration

For the legacy MCP server, create `legacy/webhook-config.json`:

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
git clone https://github.com/zudsniper/mcp-notifications.git
cd mcp-notifications
```

2. Install dependencies for all workspaces:
```bash
npm install
```

3. Build all packages:
```bash
npm run build
```

### Development Commands

```bash
# Run SSE server locally
cd apps/sse-server
npm run dev

# Run web dashboard
cd apps/web
npm run dev

# Build shared package
cd packages/shared
npm run build

# Test legacy server
cd legacy
npm run test
```

### Testing Webhooks

Test scripts are available in `legacy/src/`:
- `test-discord.js` - Test Discord webhooks
- `test-ntfy.js` - Test ntfy notifications
- `test-slack.js` - Test Slack webhooks

### Deployment

#### Deploy SSE Server to Cloudflare

```bash
cd apps/sse-server
npm run deploy
```

#### Deploy Web Dashboard to Vercel

```bash
cd apps/web
vercel
```

## Migration Guide

### Migrating from v2.x to v3.0

1. **Legacy Support**: The original MCP server is still available in `legacy/` directory
2. **New Features**: Consider adopting SSE for real-time notifications
3. **Database**: Set up PocketBase for persistent storage
4. **API Changes**: Update API calls to use new endpoints

See [MIGRATION.md](./docs/MIGRATION.md) for detailed migration instructions.

## Performance

- **SSE Connections**: Support for thousands of concurrent connections via Durable Objects
- **Rate Limiting**: Built-in protection against abuse (10 requests/minute default)
- **Queue Processing**: Reliable webhook delivery with automatic retries
- **Edge Computing**: Global distribution via Cloudflare Workers

## Security

- **Authentication**: Token-based auth for ntfy webhooks
- **Rate Limiting**: KV-based rate limiting per user
- **CORS**: Configurable CORS headers for web clients
- **Input Validation**: Zod schemas for all API inputs

## License

MIT License - see LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Original `mcp-server-notifier` by tuberrabbit@gmail.com
- Maintained and enhanced by [zudsniper](https://github.com/zudsniper)
- Built with Cloudflare Workers, Next.js, and PocketBase
