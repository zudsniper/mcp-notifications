#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport, } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Create an MCP server
const server = new McpServer({
    name: "mcp-server-notifier",
    version: "1.0.4"
});
// Async tool with external API call
server.tool("notify-feishu", { message: z.string() }, async ({ message }) => {
    const response = await fetch(process.env.FEISHU_WEBHOOK_URL || '', {
        method: 'POST',
        headers: {
            'accept': 'application/json'
        },
        body: JSON.stringify({
            msg_type: "text",
            content: {
                text: message
            }
        })
    });
    const data = await response.text();
    return {
        content: [{ type: "text", text: data }]
    };
});
// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
await server.connect(transport);
