# Notification Templates and Provider-Agnostic Features

This document outlines the notification templating system and provider-agnostic features available in the MCP Server Notifier.

## Provider-Agnostic Approach

MCP Server Notifier uses a provider-agnostic architecture where notification features work across different webhook providers when possible. While not all providers natively support all features, we've implemented our system to be flexible and forward-compatible:

- **Core Features** (title, message, link) work across all providers
- **Advanced Features** (priority, attachments, actions, templates) have first-class implementations where possible
- **Future Compatibility** allows for new providers to adopt these advanced features

### NotificationMessage Interface

The core `NotificationMessage` interface is designed to be provider-agnostic:

```typescript
interface NotificationMessage {
  title?: string;                   // Optional notification title
  body: string;                     // Main content of the notification
  link?: string;                    // Optional URL to include
  imageUrl?: string;                // URL of an image already hosted online; embedded directly without uploading
  priority?: number;                // Priority level (1-5, with 5 being highest)
  attachments?: string[];           // List of URLs (images, documents, files) to attach beyond the main image
  actions?: NotificationAction[];   // Interactive actions for the notification
  template?: string;                // Name of the predefined template to use
  templateData?: Record<string, any>; // Data to be used with the template
}
```

### NotificationAction Interface

Actions are defined in a provider-agnostic way, even though implementations may vary:

```typescript
interface NotificationAction {
  action: 'view' | 'http';          // Type of action
  label: string;                    // Text label for the action button
  url: string;                      // URL to open or send request to
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; // HTTP method for http actions
  headers?: Record<string, string>; // Custom headers for http action
  body?: string;                    // Request body for http action
  clear?: boolean;                  // Whether to clear notification after action
}
```

## Templating System

The notification templating system provides predefined templates for common notification scenarios. While these templates use Go templating syntax (natively supported by ntfy.sh), other providers can implement them through custom formatting.

### Available Templates

1. **Status Template (`status`)**
   - **Purpose**: Send status updates about systems, processes, or tasks
   - **Data Fields**:
     - `status` - Current status (e.g., "online", "completed", "pending")
     - `details` (optional) - Additional information about the status
     - `timestamp` (optional) - When this status was recorded
     - `component` (optional) - The system component this status applies to

2. **Question Template (`question`)**
   - **Purpose**: Ask questions that require a response
   - **Data Fields**:
     - `question` - The main question being asked
     - `context` (optional) - Background information for the question
     - `options` (optional) - Possible answer options
     - `deadline` (optional) - When a response is needed by

3. **Progress Template (`progress`)**
   - **Purpose**: Track progress of long-running tasks
   - **Data Fields**:
     - `title` - Name of the task or process
     - `current` - Current progress value
     - `total` - Total value to reach completion
     - `percentage` (optional) - Explicit percentage value (calculated if not provided)
     - `eta` (optional) - Estimated time to completion
     - `details` (optional) - Additional information about the progress

4. **Problem Template (`problem`)**
   - **Purpose**: Report errors or issues
   - **Data Fields**:
     - `title` - Short description of the problem
     - `description` (optional) - Detailed information about the problem
     - `severity` (optional) - How severe the problem is (e.g., "critical", "warning")
     - `source` (optional) - Where the problem originated
     - `timestamp` (optional) - When the problem occurred
     - `solution` (optional) - Suggested ways to fix the problem

### Usage Examples

#### Status Update

```javascript
{
  "template": "status",
  "templateData": {
    "status": "online",
    "details": "All systems operational",
    "timestamp": "2025-04-09 15:30 UTC",
    "component": "Database Server"
  }
}
```

#### Progress Report

```javascript
{
  "template": "progress",
  "templateData": {
    "title": "Database Backup",
    "current": 75,
    "total": 100,
    "eta": "2 minutes remaining",
    "details": "Compressing backup files"
  },
  "priority": 3
}
```

#### Error Report

```javascript
{
  "template": "problem",
  "templateData": {
    "title": "Connection Failed",
    "description": "Could not establish connection to database server",
    "severity": "critical",
    "source": "API Server",
    "timestamp": "2025-04-09 15:45 UTC",
    "solution": "Check network settings and server status"
  },
  "priority": 5
}
```

#### Question

```javascript
{
  "template": "question",
  "templateData": {
    "question": "Should we deploy the latest changes to production?",
    "context": "All tests have passed and staging deployment is stable",
    "options": "Yes, No, Wait until tomorrow",
    "deadline": "Today 18:00 UTC"
  },
  "priority": 4
}
```

## Implementation by Provider

### Ntfy

Ntfy has the most complete implementation of all features:

- **Templates**: Natively supported through Go templates
- **Actions**: Fully supported with all options
- **Priority**: Native support (1-5)
- **Attachments**: Multiple attachments supported

### Discord

Discord notifications are sent as rich embeds, which allows for a high degree of formatting.

- **Templates**: Implemented using custom-formatted embeds.
- **Priority**: Mapped to embed colors (e.g., red for high priority).
- **Actions**: Rendered as clickable links within the embed.
- **Attachments**: Displayed as fields in the embed.

### Slack

Slack notifications are sent using **Block Kit** and **attachments**, which provide a rich and interactive experience.

#### Configuration

To use Slack, set your `WEBHOOK_TYPE` to `slack` and provide an **Incoming Webhook URL**.

1.  Create a new Slack App in your workspace if you don't have one already.
2.  Navigate to **Incoming Webhooks** and activate it.
3.  Click **Add New Webhook to Workspace**.
4.  Choose the channel where you want messages to be posted and click **Authorize**.
5.  Copy the provided webhook URL (e.g., `https://hooks.slack.com/services/...`). This is your `WEBHOOK_URL`.

**Important**: The channel is determined by the webhook URL itself. If you want to send notifications to different channels, you must create a separate webhook for each one.

#### Feature Implementation

- **Templates**: Implemented using a combination of Block Kit and colored attachments.
  - `status`: Adds a context block with a status icon and text.
  - `progress`: Shows a text-based progress bar.
  - `problem`: Uses a red attachment color and displays error details in a pre-formatted block.
  - `question`: Lists options in the message body.
- **Priority**: Mapped to the attachment color on the side of the message.
  - 5 (High): Red
  - 4 (Medium): Yellow
  - 3 (Normal): Blue
  - 1-2 (Low): Green
- **Actions**: Rendered as interactive buttons. Note that all actions (`view` and `http`) are treated as simple links, as webhooks do not support custom HTTP requests from buttons.
- **Attachments**: Appended as links in the message body.
- **Images**: The `imageUrl` is displayed as a large image block.

### Teams/Feishu

These providers implement templating through custom formatting:

- **Templates**: Formatted as structured messages/cards.
- **Actions**: Limited support (typically as buttons or links).
- **Priority**: Represented visually (e.g., colors, icons).
- **Attachments**: Limited to single images in most cases.

### Generic/Custom

- **Templates**: Basic text formatting
- **Actions**: Typically only link support
- **Priority**: Not directly supported
- **Attachments**: Limited to single image

## Extending with Custom Templates

You can extend the templating system by adding your own templates to the `NOTIFICATION_TEMPLATES` object in the source code.

## Future Development

Future versions may include:

1. Custom user-defined templates via configuration
2. More sophisticated template rendering for non-ntfy providers
3. Additional template types for specific use cases
4. Better cross-provider implementation of advanced features 