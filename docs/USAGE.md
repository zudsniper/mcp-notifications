# Usage Guide

MCP Server Notifier provides MCP tools for sending notifications to various webhook providers.

## Available Tools

The notifier provides one main tool:

1. `notify` - Flexible notification tool with support for text, links, and images

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

### With Remote Images

If you've configured Imgur support:

```
Please notify me when the chart is generated and include it in the notification.
```

The AI agent can then call:

```
await run("notify", { 
  title: "Chart Generated", 
  message: "Here's the performance chart you requested.",
  imageUrl: "https://url-to-generated-image.png" // Use imageUrl when the image is already hosted online
});
```

### With Local Image Files

You can now directly upload local image files:

```
Please notify me with a screenshot of the current view.
```

The AI agent can then call:

```
await run("notify", { 
  title: "Current View", 
  message: "Here's a screenshot of the current application state.",
  image: "/path/to/screenshot.png" // Use image when the image is a local file that needs uploading
});
```

The image file will be automatically read, uploaded to Imgur, and included in the notification.

### Advanced Ntfy Features

When using the `ntfy` provider, you can leverage additional features:

```javascript
await run("notify", {
  message: "Disk usage is high!",
  title: "Server Alert",
  priority: 5, // Set ntfy priority (1=min, 5=max)
  attachments: [
    "https://example.com/disk_usage_chart.png" // Use attachments for additional files or links beyond the main image
  ],
  actions: [
    {
      action: "view", // Add a 'view' action button
      label: "Open Grafana",
      url: "https://grafana.example.com/d/abcdefg"
    },
    {
      action: "http", // Add an 'http' action button
      label: "Clear Cache",
      url: "https://api.example.com/clear-cache",
      method: "POST",
      headers: {"X-API-Key": "secret-key"},
      clear: true // Clear notification after action
    }
  ]
});
```

This allows setting message priority, attaching files by URL, and adding custom action buttons to the notification.

## Setting up as a Cursor Rule

For consistent usage, you can configure this as a rule in Cursor:

1. Open Cursor Settings
2. Go to Rules
3. Create a new rule like:

```
When task is complete, notify me using the MCP Server Notifier with a summary of what was done.
```

## Imgur Image Support

The `notify` tool supports two ways to include a **main image**:

1. `imageUrl`: Use this when the image is **already hosted online** and accessible via a direct URL. The notification will embed or display this image without uploading it.
2. `image`: Use this when the image is a **local file on your system**. The system will upload this image (e.g., to Imgur or ntfy) before including it in the notification.

Additionally, you can provide:
- `attachments`: A list of URLs (images, documents, files) to attach **beyond the main image**. These may be displayed as links or previews, depending on the service.

When providing either `image` or `imageUrl`, the image may be:
- Uploaded to Imgur (if configured)
- The resulting URL included in the webhook notification

This is useful for:
- Sharing generated charts or diagrams
- Sharing screenshots
- Ensuring images remain accessible after temporary files are cleaned up
