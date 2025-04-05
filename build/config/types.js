/**
 * Configuration types for MCP Server Notifier
 */
// Supported webhook types
export var WebhookType;
(function (WebhookType) {
    WebhookType["FEISHU"] = "feishu";
    WebhookType["DISCORD"] = "discord";
    WebhookType["SLACK"] = "slack";
    WebhookType["TEAMS"] = "teams";
    WebhookType["GENERIC"] = "generic";
    WebhookType["CUSTOM"] = "custom";
})(WebhookType || (WebhookType = {}));
