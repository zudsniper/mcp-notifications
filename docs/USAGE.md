# Usage Guide

MCP Server Notifier provides MCP tools for sending notifications to various webhook providers.

## Available Tools

The notifier provides two main tools:

1. `notify-feishu` - Legacy tool for backward compatibility
2. `notify` - New tool with enhanced capabilities

## Basic Usage

After setting up the MCP server in Cursor (see [Installation](../README.md#installation)), you can use it with your AI agent.

### Simple Notification

```
Please use the notify tool to send me a message when you're done with this task.
```

The AI agent can then call:

```
await run("notify", { message: "Task completed successfully!" });
```

### Rich Notifications

```
Please notify me when you're done with a nice summary and include a link to the documentation.
```

The AI agent can then call:

```
await run("notify", { 
  title: "Task Completed", 
  message: "I've successfully implemented the feature you requested.", 
  link: "https://github.com/your-repo/docs"
});
```

### With Images

If you've configured Imgur support:

```
Please notify me when the chart is generated and include it in the notification.
```

The AI agent can then call:

```
await run("notify", { 
  title: "Chart Generated", 
  message: "Here's the performance chart you requested.", 
  imageUrl: "https://url-to-generated-image.png"
});
```

## Setting up as a Cursor Rule

For consistent usage, you can configure this as a rule in Cursor:

1. Open Cursor Settings
2. Go to Rules
3. Create a new rule like:

```
When task is complete, notify me using the MCP Server Notifier with a summary of what was done.
```

## Imgur Image Support

When providing an `imageUrl` to the `notify` tool, the image will be:

1. Uploaded to Imgur (if configured)
2. The Imgur URL will be included in the webhook notification

This is useful for:
- Sharing generated charts/diagrams
- Sharing screenshots
- Ensuring images remain accessible after temporary files are cleaned up
