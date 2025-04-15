import express, { Request, Response, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Type definition for a pending question
interface PendingQuestion {
  id: string;
  question: string;
  title?: string;
  createdAt: Date;
  timeout: number; // timeout in seconds
  responsePromise: {
    resolve: (response: string) => void;
    reject: (error: Error) => void;
  };
}

// Store for pending questions
const pendingQuestions: Map<string, PendingQuestion> = new Map();

// Create express app
const app = express();

// Configure express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
const publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(publicPath)) {
  fs.mkdirSync(publicPath, { recursive: true });
}
app.use(express.static(publicPath));

// Generate simple HTML for the ask UI
function generateAskHtml(question: PendingQuestion) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Answer Question</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
      line-height: 1.6;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    .question-container {
      background-color: #f9f9f9;
      border-left: 4px solid #3498db;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 0 4px 4px 0;
    }
    textarea {
      width: 100%;
      min-height: 150px;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 15px;
      font-family: inherit;
    }
    button {
      background-color: #3498db;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background-color: #2980b9;
    }
    .timer {
      color: #e74c3c;
      font-weight: bold;
      padding: 5px 0;
      margin-bottom: 15px;
    }
  </style>
</head>
<body>
  <h1>${question.title || 'Question'}</h1>
  <div class="question-container" id="question-text">
    ${question.question}
  </div>
  
  <div class="timer" id="timer">Time remaining: ${question.timeout} seconds</div>
  
  <textarea id="answer-text" placeholder="Type your answer here..."></textarea>
  <button id="send-button">Send Answer</button>

  <script>
    // Format the question text
    const questionText = document.getElementById('question-text');
    // Basic markdown-like formatting (not a full implementation)
    questionText.innerHTML = questionText.innerHTML
      .replace(/\\n\\n/g, '<br><br>')
      .replace(/\\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\`(.*?)\`/g, '<code>$1</code>');

    // Set up timer
    let timeLeft = ${question.timeout};
    const timerElement = document.getElementById('timer');
    
    function updateTimer() {
      timerElement.textContent = \`Time remaining: \${timeLeft} seconds\`;
      
      if (timeLeft <= 0) {
        clearInterval(timerId);
        alert('Time expired. Your answer was not submitted.');
        timerElement.textContent = 'Time expired';
        document.getElementById('send-button').disabled = true;
        document.getElementById('answer-text').disabled = true;
      } else {
        timeLeft -= 1;
      }
    }
    
    // Initialize timer display
    updateTimer();
    // Update timer every second
    const timerId = setInterval(updateTimer, 1000);

    // Handle form submission
    document.getElementById('send-button').addEventListener('click', async () => {
      const answer = document.getElementById('answer-text').value;
      
      if (!answer.trim()) {
        alert('Please enter an answer before submitting.');
        return;
      }
      
      try {
        const response = await fetch('/api/answer/${question.id}', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ answer }),
        });
        
        if (response.ok) {
          clearInterval(timerId);
          alert('Answer submitted successfully!');
          document.getElementById('send-button').disabled = true;
          document.getElementById('answer-text').disabled = true;
          timerElement.textContent = 'Answer submitted';
        } else {
          const errorData = await response.json();
          alert(\`Failed to submit answer: \${errorData.error || 'Unknown error'}\`);
        }
      } catch (error) {
        alert('An error occurred while submitting your answer.');
        console.error('Error:', error);
      }
    });
  </script>
</body>
</html>
  `;
}

// Route to view a question
app.get('/:questionId', (function(req: Request, res: Response) {
  const questionId = req.params.questionId;
  const question = pendingQuestions.get(questionId);
  
  if (!question) {
    res.status(404).send('Question not found or has expired.');
    return;
  }
  
  res.send(generateAskHtml(question));
}) as RequestHandler);

// API route to submit an answer
app.post('/api/answer/:questionId', (function(req: Request, res: Response) {
  const questionId = req.params.questionId;
  const answer = req.body.answer;
  
  if (!answer) {
    res.status(400).json({ error: 'Answer is required' });
    return;
  }
  
  const question = pendingQuestions.get(questionId);
  if (!question) {
    res.status(404).json({ error: 'Question not found or has expired' });
    return;
  }
  
  // Resolve the promise with the answer
  question.responsePromise.resolve(answer);
  
  // Remove the question from the pending map
  pendingQuestions.delete(questionId);
  
  res.status(200).json({ message: 'Answer submitted successfully' });
}) as RequestHandler);

// Function to register a new question
export function askQuestion(question: string, title: string | undefined, timeout: number): {questionId: string, answerPromise: Promise<string>} {
  const questionId = uuidv4();
  
  // Create a promise that will be resolved when an answer is received
  let resolvePromise: (value: string) => void;
  let rejectPromise: (reason: Error) => void;
  
  const responsePromise = new Promise<string>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  
  // Register the question
  const pendingQuestion: PendingQuestion = {
    id: questionId,
    question,
    title,
    createdAt: new Date(),
    timeout,
    responsePromise: {
      resolve: resolvePromise!,
      reject: rejectPromise!
    }
  };
  
  pendingQuestions.set(questionId, pendingQuestion);
  
  // Set up timeout to automatically reject the promise after the specified timeout
  setTimeout(() => {
    const question = pendingQuestions.get(questionId);
    if (question) {
      question.responsePromise.reject(new Error(\`Question timed out after \${timeout} seconds\`));
      pendingQuestions.delete(questionId);
    }
  }, timeout * 1000);

  console.log(\`Question registered with ID: \${questionId}\`);
  
  return {
    questionId,
    answerPromise: responsePromise
  };
}

// Helper function to get question URL
export function getQuestionUrl(questionId: string, serverUrl: string, port: number): string {
  return \`\${serverUrl}:\${port}/\${questionId}\`;
}

// Start the server
let server: ReturnType<typeof app.listen> | null = null;

export function startServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(port, () => {
        console.log(\`Ask server running on port \${port}\`);
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function stopServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (server) {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    } else {
      resolve();
    }
  });
} 