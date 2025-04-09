# Configuration Guide

MCP Server Notifier supports multiple configuration methods and webhook providers.

## Configuration Methods

You can configure the notifier using either:

1. Environment variables
2. JSON configuration file

### Environment Variables

Basic configuration:
```bash
env WEBHOOK_URL="https://your-webhook-url" WEBHOOK_TYPE="discord" npx -y mcp-server-notifier
```

With Imgur support:
```bash
env WEBHOOK_URL="https://your-webhook-url" WEBHOOK_TYPE="discord" IMGUR_CLIENT_ID="your-client-id" npx -y mcp-server-notifier
```

All supported environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `WEBHOOK_URL` | The URL of your webhook | Yes |
| `WEBHOOK_TYPE` | Type of webhook (`discord`, `slack`, `teams`, `feishu`, `ntfy`, `generic`, `custom`) | No (defaults to `generic`) |
| `IMGUR_CLIENT_ID` | Imgur API client ID for image uploads | No |
| `IMGUR_API_URL` | Custom Imgur API URL (if needed) | No |

### JSON Configuration

You can create a `webhook-config.json` file in your current directory or in `~/.config/mcp-notifier/webhook-config.json`:

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

### Ntfy Advanced Configuration

When using the `ntfy` webhook type, you can specify additional configuration options:

```json
{
  "webhook": {
    "type": "ntfy",
    "url": "https://ntfy.sh/your-topic",
    "token": "your-auth-token", // Optional: Bearer token for authentication
    "defaultPriority": 4,       // Optional: Default priority (1-5)
    "templates": {                // Optional: Templates for message formatting
      "title": "[P{priority}] {title}",
      "message": "{body}\n\nAttachments: {attachments}"
    },
    "defaultActions": [{          // Optional: Default actions
      "action": "view",
      "label": "Open Dashboard",
      "url": "https://example.com"
    }]
  }
}
```

You can also configure these via environment variables:
- `NTFY_TOKEN`
- `NTFY_DEFAULT_PRIORITY`
- `NTFY_TEMPLATE_TITLE`
- `NTFY_TEMPLATE_MESSAGE`

## Supported Webhook Types

### Discord

```