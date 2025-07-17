# Bilan Server Dockerfile
# Multi-stage build for production deployment

# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ && \
    ln -sf python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY packages/sdk/package*.json packages/sdk/
COPY packages/server/package*.json packages/server/

# Install all dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code
COPY packages/sdk/ packages/sdk/
COPY packages/server/ packages/server/
COPY tsconfig.json ./

# Build SDK first (server depends on it)
WORKDIR /app/packages/sdk
RUN npm run build

# Build server
WORKDIR /app/packages/server
RUN npm run build

# Clean install production dependencies only (after building is complete)
WORKDIR /app
RUN npm ci --only=production

# Production stage
FROM node:20-alpine AS production

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bilan -u 1001

# Set working directory
WORKDIR /app

# Copy package files and pre-built node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages/server/package*.json packages/server/
COPY --from=builder /app/packages/sdk/package*.json packages/sdk/
COPY --from=builder /app/node_modules ./node_modules

# Copy built applications
COPY --from=builder /app/packages/server/dist/ packages/server/dist/
COPY --from=builder /app/packages/sdk/dist/ packages/sdk/dist/

# Copy package.json files for runtime
COPY --from=builder /app/packages/sdk/package.json packages/sdk/
COPY --from=builder /app/packages/server/package.json packages/server/

# Set ownership and permissions
RUN chown -R bilan:nodejs /app
USER bilan

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3002
ENV DB_PATH=/app/data/bilan.db

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3002/health').then(() => process.exit(0)).catch(() => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the server
CMD ["node", "packages/server/dist/cli.js"] 