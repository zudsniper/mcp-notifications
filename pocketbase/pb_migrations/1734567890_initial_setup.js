/// <reference path="../pb_data/types.d.ts" />
migrate((db) => {
  // Create system notification templates
  const templates = [
    {
      name: 'status',
      title_template: 'Status Update: {{status}}',
      body_template: 'Status: {{status}}\nMessage: {{message}}\nTimestamp: {{timestamp}}',
      default_data: JSON.stringify({
        status: 'Success',
        message: 'Operation completed successfully',
        timestamp: new Date().toISOString()
      }),
      is_system: true
    },
    {
      name: 'question',
      title_template: 'Question: {{question}}',
      body_template: 'Question: {{question}}\nContext: {{context}}\nRequested by: {{requester}}',
      default_data: JSON.stringify({
        question: 'Sample question',
        context: 'Additional context',
        requester: 'AI Agent'
      }),
      is_system: true
    },
    {
      name: 'progress',
      title_template: 'Progress Update: {{task}}',
      body_template: 'Task: {{task}}\nProgress: {{progress}}%\nEstimated completion: {{eta}}',
      default_data: JSON.stringify({
        task: 'Sample task',
        progress: 50,
        eta: '5 minutes'
      }),
      is_system: true
    },
    {
      name: 'problem',
      title_template: 'Problem Report: {{error}}',
      body_template: 'Error: {{error}}\nDescription: {{description}}\nSeverity: {{severity}}',
      default_data: JSON.stringify({
        error: 'Sample error',
        description: 'Error description',
        severity: 'High'
      }),
      is_system: true
    }
  ];

  // Insert system templates with null user_id for system-wide availability
  const collection = $app.dao().findCollectionByNameOrId("notification_templates");
  
  templates.forEach(template => {
    const record = new Record(collection, {
      user_id: null, // Set to null for system templates to avoid constraint violations
      name: template.name,
      title_template: template.title_template,
      body_template: template.body_template,
      default_data: template.default_data,
      is_system: template.is_system
    });
    
    $app.dao().saveRecord(record);
  });
}, (db) => {
  // Rollback - remove system templates
  const dao = $app.dao();
  const collection = dao.findCollectionByNameOrId("notification_templates");
  const records = dao.findRecordsByExpr(collection, $dbx.exp.eq("is_system", true));
  
  records.forEach(record => {
    dao.deleteRecord(record);
  });
});