# MCP Server Notifier - Notification System Roadmap

## Current State
- Basic templates are implemented in a provider-agnostic way
- Templates are currently defined statically in code
- Provider-specific templating is not fully implemented

## Future Implementation Plan

### Phase 1: Improved Templating System
- Replace Go Templates with TypeScript/Zod-based template system
- Create a proper TypeScript interface for all template operations
- Implement provider-specific template rendering methods
- Maintain backward compatibility for existing templates

### Phase 2: Provider-Specific Implementations
- Implement provider-specific template handling for each webhook type:
  - Discord
  - Slack
  - Teams
  - Feishu
  - ntfy.sh
  - Custom webhook providers
- Each provider will implement its own method for template application

### Phase 3: Dynamic Template Configuration
- Allow loading templates from configuration files
- Support runtime template additions and modifications
- Implement template validation using Zod schemas
- Add better template documentation and examples

### Phase 4: Rich Template Features
- Support for template inheritance and composition
- Add conditional rendering logic
- Support for template localization
- Template preview functionality

## Implementation Details
Each webhook provider will implement a `applyTemplate` method that:
1. Takes a notification template and template data
2. Processes the template according to provider-specific formatting
3. Returns a properly formatted message for that specific provider 