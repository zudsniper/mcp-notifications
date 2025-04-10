FROM node:20-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Make the start script executable
RUN chmod +x build/index.js

# Set NODE_ENV to production
ENV NODE_ENV=production

# Define entrypoint
ENTRYPOINT ["node", "build/index.js"]
