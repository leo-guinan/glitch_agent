FROM node:20-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y python3 python-is-python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Copy all source files first
COPY . .

# Install dependencies
RUN pnpm install

# Build the application
RUN pnpm run build

# Expose the port
EXPOSE 4111

# Set environment variables
ENV NODE_ENV=production

# Start the server
CMD ["pnpm", "start"] 