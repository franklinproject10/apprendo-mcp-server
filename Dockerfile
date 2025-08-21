FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code and data
COPY src/ ./src/
COPY data/ ./data/

# Set execute permissions for node_modules binaries
RUN chmod +x node_modules/.bin/*

# Build the TypeScript code
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]