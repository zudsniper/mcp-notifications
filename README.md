# mcp-server-notifier
Lightweight Node.js server sending Feishu webhook notifications. Ideal for devs using AI agents (e.g., Cursor) on multi-projects, alerting task completion for efficient switching. Features webhook alerts, multi-project dev, AI integration, easy setup for dev tools &amp; automation.

轻量 Node.js 服务器，向飞书 webhook 发送通知。适合开发者用 AI 代理（如 Cursor）开发多项目，任务完成后自动通知，提升效率。支持 webhook 通知、任务提醒、多项目开发、AI 集成，易安装配置，优化开发者工具与自动化工作流。

## Installation
Setup BrowserTools MCP Tool:
1. Go to your 'Cursor Settings'
2. Go to Features, scroll down to MCP Servers and click on 'Add new MCP server'
![MCP Server Setup](/docs/guide.jpg)

3. Give it a unique name (mcp-server-notifier), set type to 'command' and set command to:

`env FEISHU_WEBHOOK_URL=[YOUR WEBHOOK URL] npx -y mcp-server-notifier`

## Usage

- tell agent to notify you a custom message when task is done
- config it as a rule in cursor rules without duplicating it everytime (recommand)