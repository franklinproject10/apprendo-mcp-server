FROM node:18

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code and data
COPY src/ ./src/
COPY data/ ./data/

# Build the TypeScript code
RUN npm run build

# Expose port
EXPOSE 3000

# Use the HTTP server for Railway deployment
CMD ["npm", "start"]