# MCP 服务器通知工具

轻量 Node.js 服务器，向webhook发送通知。适合开发者用 AI 代理（如 Cursor）开发多项目，任务完成后自动通知，提升效率。支持 webhook 通知、任务提醒、多项目开发、AI 集成，易安装配置，优化开发者工具与自动化工作流。

## 安装

设置 BrowserTools MCP 工具:
1. 进入 'Cursor 设置'
2. 进入功能区，滚动到 MCP 服务器并点击 '添加新 MCP 服务器'
![MCP 服务器设置](/docs/guide.jpg)

3. 配置服务器:
   - 名称: `mcp-server-notifier` (或任何唯一名称)
   - 类型: `command`
   - 命令: `env WEBHOOK_URL=[您的Webhook地址] WEBHOOK_TYPE=[提供商] npx -y mcp-server-notifier`

   查看[配置](#配置)部分了解更多可用的webhook类型。

## 使用

- 告诉代理当任务完成时通过自定义消息通知您
- 将其配置为 Cursor 规则，无需每次重复设置 (推荐)

## 配置

默认情况下，通知工具支持多种webhook类型。您可以通过环境变量指定webhook类型和URL：

```bash
env WEBHOOK_URL="https://your-webhook-url" WEBHOOK_TYPE="discord" npx -y mcp-server-notifier
```

更高级的配置，请查看[高级配置](#高级配置)部分。
