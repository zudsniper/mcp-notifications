#!/usr/bin/env node

/**
 * Test script for ntfy webhook notifications
 *
 * Usage: node src/test-ntfy.js
 */

const NTFY_URL = process.env.NTFY_WEBHOOK_URL || process.env.WEBHOOK_URL || 'https://ntfy.sh/BKYV4aRVghV6Pag4';

async function sendNtfy(body, headers = {}) {
  const res = await fetch(NTFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      ...headers
    },
    body
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Failed (${res.status}): ${text}`);
  }
  console.log(`Sent (${res.status}): ${text}`);
}

async function runTests() {
  console.log('Starting ntfy webhook tests...');
  await sendNtfy('Test 1: Basic notification');
  await sendNtfy('Test 2: High priority', { Priority: '5' });
  await sendNtfy('Test 3: With link and attachment', {
    Click: 'https://github.com/zudsniper/mcp-server-notifier',
    Attach: 'https://ntfy.sh/static/logo.png'
  });
  console.log('All ntfy tests completed');
}

runTests().catch(err => {
  console.error('Error running ntfy tests:', err);
  process.exit(1);
});
