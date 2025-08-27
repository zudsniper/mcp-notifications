/**
 * Predefined templates for notifications
 * These templates can be used by different webhook providers,
 * though some providers may implement them differently.
 */

export interface NotificationTemplate {
  title: string;
  message: string;
}

export type TemplateData = Record<string, any>;

// Collection of predefined templates
export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  // Status update template
  status: {
    title: "Status Update: {{.status}}",
    message: `
Status: {{.status}}
{{if .details}}Details: {{.details}}{{end}}
{{if .timestamp}}Time: {{.timestamp}}{{end}}
{{if .component}}Component: {{.component}}{{end}}
`
  },
  
  // Question template
  question: {
    title: "Question: {{.question}}",
    message: `
Question: {{.question}}
{{if .context}}Context: {{.context}}{{end}}
{{if .options}}Options: {{.options}}{{end}}
{{if .deadline}}Response needed by: {{.deadline}}{{end}}
`
  },
  
  // Progress update template
  progress: {
    title: "Progress: {{.title}}",
    message: `
Task: {{.title}}
Progress: {{.current}}/{{.total}} ({{if .percentage}}{{.percentage}}%{{else}}{{if and .current .total}}{{div (mul .current 100) .total}}%{{else}}In Progress{{end}}{{end}})
{{if .eta}}ETA: {{.eta}}{{end}}
{{if .details}}Details: {{.details}}{{end}}
`
  },
  
  // Problem/error template
  problem: {
    title: "Problem: {{.title}}",
    message: `
Error: {{.title}}
{{if .description}}Description: {{.description}}{{end}}
{{if .severity}}Severity: {{.severity}}{{end}}
{{if .source}}Source: {{.source}}{{end}}
{{if .timestamp}}Time: {{.timestamp}}{{end}}
{{if .solution}}Suggested Solution: {{.solution}}{{end}}
`
  }
};

// Legacy reference to maintain backward compatibility
export const NTFY_TEMPLATES = NOTIFICATION_TEMPLATES;

/**
 * Get a predefined template by name
 * @param name Template name
 * @returns Template if found, undefined otherwise
 */
export function getTemplate(name: string): NotificationTemplate | undefined {
  return NOTIFICATION_TEMPLATES[name];
}

/**
 * Check if a template exists
 * @param name Template name
 * @returns true if the template exists, false otherwise
 */
export function hasTemplate(name: string): boolean {
  return name in NOTIFICATION_TEMPLATES;
}

/**
 * List all available template names
 * @returns Array of template names
 */
export function listTemplateNames(): string[] {
  return Object.keys(NOTIFICATION_TEMPLATES);
} 