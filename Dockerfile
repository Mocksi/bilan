# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/sdk/package*.json ./packages/sdk/

# Install all dependencies (including devDependencies for building)
RUN npm ci

# Copy source code
COPY . .

# Build the packages
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files for production dependencies only
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/sdk/package*.json ./packages/sdk/

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built output from build stage
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/sdk/dist ./packages/sdk/dist

# Copy other necessary files (if any)
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/sdk/package.json ./packages/sdk/

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S bilan -u 1001

# Create volume for database and set ownership
RUN mkdir -p /app/data && chown -R bilan:nodejs /app/data
VOLUME ["/app/data"]

# Switch to non-root user
USER bilan

# Expose port
EXPOSE 3001

# Set environment variables
ENV DB_PATH=/app/data/bilan.db
ENV PORT=3001
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Start the server
CMD ["node", "packages/server/dist/cli.js"] 