# PocketBase Configuration

This directory contains the PocketBase configuration for the MCP Notifications SSE server.

## Setup

1. Download PocketBase from https://pocketbase.io/docs/
2. Place the `pocketbase` binary in this directory or add it to your PATH
3. Run `./pocketbase serve` to start the server

## Schema

The database schema includes:

- **users** - Authentication collection for user management
- **webhook_configs** - Webhook configurations per user
- **sse_connections** - Active SSE connection tracking
- **notification_history** - Log of all sent notifications
- **notification_templates** - User-defined and system notification templates

## Development

To apply the schema:

```bash
./pocketbase serve --dir ./pb_data
```

Then visit http://localhost:8090/_/ to access the admin panel.

## Cloudflare Deployment

For Cloudflare deployment, you'll need to:

1. Use PocketBase Cloud or deploy PocketBase to a VPS
2. Configure environment variables in the Cloudflare Worker
3. Update the database URL in your Next.js app

## Environment Variables

Required environment variables:

- `POCKETBASE_URL` - URL to your PocketBase instance
- `POCKETBASE_ADMIN_EMAIL` - Admin email for setup
- `POCKETBASE_ADMIN_PASSWORD` - Admin password for setup

## Migrations

Migrations are stored in `pb_migrations/` and will be automatically applied when PocketBase starts.