FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/
COPY packages/sdk/package*.json ./packages/sdk/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the packages
RUN npm run build

# Expose port
EXPOSE 3001

# Create volume for database
VOLUME ["/app/data"]

# Set environment variables
ENV DB_PATH=/app/data/bilan.db
ENV PORT=3001
ENV HOST=0.0.0.0

# Start the server
CMD ["npm", "run", "start:server"] 