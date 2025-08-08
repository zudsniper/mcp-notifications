#!/usr/bin/env node

/**
 * Test script for Slack webhook notifications
 *
 * Usage: node src/test-slack.js
 *
 * You need to have a SLACK_WEBHOOK_URL environment variable set.
 */

import fetch from 'node-fetch';

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

if (!SLACK_WEBHOOK_URL) {
  console.error('Error: SLACK_WEBHOOK_URL environment variable not set.');
  console.error('Please set it to your Slack incoming webhook URL.');
  process.exit(1);
}

async function sendSlackMessage(payload) {
  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send Slack message: ${response.status} ${text}`);
  }

  return response;
}

async function runTests() {
  console.log('Starting Slack webhook tests...');

  try {
    // Test 1: Basic Notification
    await sendSlackMessage({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'Basic Notification Test',
            emoji: true
          }
        }
      ],
      attachments: [
        {
          color: '#0099FF',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: 'This is a simple notification test.'
              }
            }
          ]
        }
      ]
    });
    console.log('Test 1: Basic notification sent');

    // Test 2: Rich Notification with all features
    await sendSlackMessage({
        "text": "Rich Notification Test",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "Rich Notification Test",
                    "emoji": true
                }
            },
            {
                "type": "image",
                "image_url": "https://i.imgur.com/wSTFkRM.png",
                "alt_text": "Test Image"
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Open GitHub",
                            "emoji": true
                        },
                        "url": "https://github.com/sammcj/mcp-server-notifier"
                    }
                ]
            }
        ],
        "attachments": [
            {
                "color": "#2EB67D",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "This notification uses many of the available features.\n<https://github.com/sammcj/mcp-server-notifier|MCP Server Notifier>"
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Attachments:*\n<https://raw.githubusercontent.com/sammcj/mcp-icons/main/mcp-icon-128.png|Icon>"
                        }
                    }
                ]
            }
        ]
    });
    console.log('Test 2: Rich notification sent');

    // Test 3: Status Template
    await sendSlackMessage({
        "text": "Status Update: Deployment Complete",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "Status Update: Deployment Complete",
                    "emoji": true
                }
            }
        ],
        "attachments": [
            {
                "color": "#4A154B",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "Deployment of version `1.2.3` to production was successful."
                        }
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": "✅ *Status:* success"
                            }
                        ]
                    }
                ]
            }
        ]
    });
    console.log('Test 3: Status template sent');

    // Test 4: Progress Template
    await sendSlackMessage({
        "text": "Progress: Database Migration",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "Progress: Database Migration",
                    "emoji": true
                }
            }
        ],
        "attachments": [
            {
                "color": "#2EB67D",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "Migrating user tables..."
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Progress:*\n[██████    ] 60%"
                        }
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": "*ETA:* 5 minutes"
                            }
                        ]
                    }
                ]
            }
        ]
    });
    console.log('Test 4: Progress template sent');

    // Test 5: Problem Template
    await sendSlackMessage({
        "text": "Problem: API Rate Limit Exceeded",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "Problem: API Rate Limit Exceeded",
                    "emoji": true
                }
            }
        ],
        "attachments": [
            {
                "color": "#E01E5A",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "The service has exceeded the API rate limit."
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Error Details:*\n```Too many requests in a short period.```"
                        }
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": "*Severity:* High"
                            }
                        ]
                    }
                ]
            }
        ]
    });
    console.log('Test 5: Problem template sent');

    // Test 6: Question Template
    await sendSlackMessage({
        "text": "Question: Deploy to Production?",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "Question: Deploy to Production?",
                    "emoji": true
                }
            }
        ],
        "attachments": [
            {
                "color": "#E1E44D",
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "All tests have passed and QA has approved. Should we deploy the latest changes to production?"
                        }
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": "*Options:*\n1. Yes\n2. No\n3. Wait until tomorrow"
                        }
                    }
                ]
            }
        ]
    });
    console.log('Test 6: Question template sent');


    console.log('All tests completed successfully!');

  } catch (error) {
    console.error('Error running tests:', error);
  }
}

runTests();
