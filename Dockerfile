FROM node:20-slim

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Expose the port
EXPOSE 4111

# Set environment variables
ENV NODE_ENV=production

# Start the server
CMD ["pnpm", "start"] 