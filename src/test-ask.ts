#!/usr/bin/env node

// Test script for the ask_question MCP tool
import { startServer, askQuestion, getQuestionUrl } from './server/ask/index.js';

async function testAsk() {
  // Configuration
  const serverUrl = 'http://localhost';
  const port = 4591;
  
  console.log(`Starting test ask server on ${serverUrl}:${port}`);
  
  try {
    // Start the server
    await startServer(port);
    
    console.log('Server started successfully');
    
    // Create a test question
    const question = "This is a test question. Please provide a response to confirm the ask system is working.";
    const title = "Test Question";
    const timeout = 120; // 2 minutes
    
    console.log(`Asking question: ${title}`);
    console.log(`Question content: ${question}`);
    console.log(`Timeout: ${timeout} seconds`);
    
    // Ask the question
    const { questionId, answerPromise } = askQuestion(question, title, timeout);
    
    // Generate the URL
    const questionUrl = getQuestionUrl(questionId, serverUrl, port);
    
    console.log(`Question URL: ${questionUrl}`);
    console.log('Please visit this URL in your browser to answer the question.');
    console.log('Waiting for an answer...');
    
    try {
      // Wait for the answer
      const answer = await answerPromise;
      console.log(`Answer received: ${answer}`);
    } catch (error: any) {
      console.error(`Error while waiting for answer: ${error.message}`);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  } finally {
    // Keep server running for manual testing
    console.log('Test completed. The server will continue running. Press Ctrl+C to stop.');
  }
}

// Run the test
testAsk(); 