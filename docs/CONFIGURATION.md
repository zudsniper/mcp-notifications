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
| `WEBHOOK_TYPE` | Type of webhook (`discord`, `slack`, `teams`, `feishu`, `generic`, `custom`) | No (defaults to `generic`) |
| `FEISHU_WEBHOOK_URL` | Legacy support for Feishu webhook URL | No |
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

## Supported Webhook Types

### Discord

```json
{
  "webhook": {
    "type": "discord",
    "url": "https://discord.com/api/webhooks/your-webhook-url"
  }
}
```

### Slack

```json
{
  "webhook": {
    "type": "slack",
    "url": "https://hooks.slack.com/services/your-webhook-url"
  }
}
```

### Microsoft Teams

```json
{
  "webhook": {
    "type": "teams",
    "url": "https://outlook.office.com/webhook/your-webhook-url"
  }
}
```

### Feishu

```json
{
  "webhook": {
    "type": "feishu",
    "url": "https://open.feishu.cn/open-apis/bot/v2/hook/your-webhook-url"
  }
}
```

### Generic

The generic webhook type sends a simple JSON payload with title, text, URL, and imageUrl fields:

```json
{
  "webhook": {
    "type": "generic",
    "url": "https://your-webhook-url"
  }
}
```

### Custom

For custom webhook formats, use the "custom" type. You'll need to customize the formatter implementation in the code.

```json
{
  "webhook": {
    "type": "custom",
    "url": "https://your-custom-webhook"
  }
}
```

## Image Upload Configuration

To enable image uploads to Imgur:

```json
{
  "imgur": {
    "clientId": "your-imgur-client-id"
  }
}
```

Without a client ID, anonymous uploads will be attempted but may be rate-limited.

## Configuration Precedence

1. Environment variables take precedence over JSON configuration files
2. Current directory `webhook-config.json` takes precedence over home directory config
