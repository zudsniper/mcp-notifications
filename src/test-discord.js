#!/usr/bin/env node

/**
 * Test script for Discord webhook notifications
 * 
 * Usage: node src/test-discord.js
 */

import fetch from 'node-fetch';

// Replace with your Discord webhook URL, or pass as an environment variable
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 
  'https://discord.com/api/webhooks/938279255102591016/your-webhook-token';

// Set the Discord channel ID
const DISCORD_CHANNEL_ID = '1360384188854833152';

// Test different types of notifications
async function runTests() {
  console.log('Starting Discord webhook tests...');
  
  try {
    // Test 1: Basic notification
    await sendDiscordEmbed({
      title: 'Basic Notification Test',
      description: 'This is a simple notification test',
      color: 0x0099FF
    });
    console.log('Test 1: Basic notification sent');
    
    // Test 2: Rich embed with all features
    await sendDiscordEmbed({
      title: 'Rich Embed Test',
      description: 'This notification uses all available Discord embed features',
      url: 'https://github.com/your-username/mcp-server-notifier',
      color: 0x57F287,
      timestamp: new Date().toISOString(),
      thumbnail: {
        url: 'https://img.icons8.com/external-smashingstocks-outline-color-smashing-stocks/66/external-rocket-space-smashingstocks-outline-color-smashing-stocks.png'
      },
      image: {
        url: 'https://i.imgur.com/wSTFkRM.png'
      },
      author: {
        name: 'Test User',
        url: 'https://github.com/test-user',
        icon_url: 'https://github.com/test-user.png'
      },
      footer: {
        text: 'MCP Server Notifier',
        icon_url: 'https://i.imgur.com/wSTFkRM.png'
      },
      fields: [
        {
          name: 'Field 1',
          value: 'Value 1',
          inline: true
        },
        {
          name: 'Field 2',
          value: 'Value 2',
          inline: true
        },
        {
          name: 'Field 3',
          value: 'Value 3',
          inline: false
        }
      ]
    });
    console.log('Test 2: Rich embed sent');
    
    // Test 3: Status template simulation
    await sendDiscordEmbed({
      title: '✅ Status Update: Deployment Complete',
      description: 'Status: success\nDetails: Deployed version 1.2.3 to production\nTime: 2023-07-01 14:30:00\nComponent: API Server',
      color: 0x5865F2,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MCP Server Notifier'
      }
    });
    console.log('Test 3: Status template simulation sent');
    
    // Test 4: Progress template simulation
    await sendDiscordEmbed({
      title: 'Progress: Database Migration',
      description: 'Task: Database Migration\nProgress: [██████    ] 60%\nETA: 5 minutes\nDetails: Migrating user tables',
      color: 0x57F287,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MCP Server Notifier'
      }
    });
    console.log('Test 4: Progress template simulation sent');
    
    // Test 5: Problem template simulation
    await sendDiscordEmbed({
      title: '⚠️ Problem: API Rate Limit Exceeded',
      description: 'Error: API Rate Limit Exceeded\nDescription: Too many requests in a short period\nSeverity: High\nSource: Authentication Service\nTime: 2023-07-01 15:45:00\nSuggested Solution: Implement rate limiting or increase quota',
      color: 0xED4245,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MCP Server Notifier'
      }
    });
    console.log('Test 5: Problem template simulation sent');
    
    // Test 6: Question template simulation
    await sendDiscordEmbed({
      title: '❓ Question: Deploy to Production?',
      description: 'Question: Should we deploy the latest changes to production?\nContext: All tests have passed and QA has approved\nOptions: Yes / No / Wait\nResponse needed by: Today at 5 PM',
      color: 0xFEE75C,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'MCP Server Notifier'
      }
    });
    console.log('Test 6: Question template simulation sent');
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

/**
 * Send a Discord embed message
 * @param {Object} embed The Discord embed object
 */
async function sendDiscordEmbed(embed) {
  const response = await fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      embeds: [embed]
    })
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to send Discord embed: ${response.status} ${text}`);
  }
  
  return response;
}

// Run the tests
runTests().catch(console.error); 