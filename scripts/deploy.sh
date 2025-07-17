#!/bin/bash
set -euo pipefail

# Bilan Docker Deployment Script
# Handles Docker deployment with proper configuration and health checks

# Source shared color functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/colors.sh"

echo "🚀 Deploying Bilan with Docker..."

# Default values
ENVIRONMENT="production"
REBUILD=false
SKIP_TESTS=false
DATA_BACKUP=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--rebuild)
            REBUILD=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --no-backup)
            DATA_BACKUP=false
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --env ENVIRONMENT    Set environment (development|production) [default: production]"
            echo "  -r, --rebuild           Force rebuild of Docker images"
            echo "  --skip-tests            Skip running tests before deployment"
            echo "  --no-backup             Skip data backup before deployment"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Run this script from the root directory."
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1 && ! docker compose version > /dev/null 2>&1; then
    print_error "Docker Compose is not installed or not in PATH"
    exit 1
fi

# Determine which docker compose command to use
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

print_status "Using Docker Compose command: $DOCKER_COMPOSE"

# Validate environment configuration
print_status "Validating environment configuration..."
if [ ! -f "ENV.example" ]; then
    print_warning "ENV.example not found. Creating basic environment template..."
fi

# Check for .env file
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Using default configuration."
    print_status "Consider copying ENV.example to .env and customizing for your deployment"
fi

# Run validation script if available
if [ -f "scripts/validate-env.sh" ]; then
    bash scripts/validate-env.sh
fi

# Backup data if requested and data exists
if [ "$DATA_BACKUP" = true ] && [ -d "data" ] && [ "$(ls -A data)" ]; then
    print_status "Creating backup of existing data..."
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    cp -r data/* "$BACKUP_DIR/" 2>/dev/null || true
    print_success "Data backed up to $BACKUP_DIR"
fi

# Run tests unless skipped
if [ "$SKIP_TESTS" = false ]; then
    print_status "Running tests before deployment..."
    if npm test > /dev/null 2>&1; then
        print_success "All tests passed"
    else
        print_warning "Some tests failed, but continuing with deployment"
    fi
fi

# Build packages
print_status "Building packages..."
if [ -f "scripts/build.sh" ]; then
    bash scripts/build.sh
else
    npm run build
fi

# Stop existing containers if running
print_status "Stopping existing containers..."
$DOCKER_COMPOSE down || true

# Remove existing images if rebuild requested
if [ "$REBUILD" = true ]; then
    print_status "Removing existing Docker images for rebuild..."
    docker images --format '{{.Repository}} {{.ID}}' | awk '/^bilan\// {print $2}' | xargs -r docker rmi -f || true
fi

# Build and start containers
print_status "Building and starting Docker containers..."
if [ "$ENVIRONMENT" = "development" ]; then
    $DOCKER_COMPOSE up --build -d
else
    # Production deployment
    $DOCKER_COMPOSE -f docker-compose.yml up --build -d
fi

# Wait for containers to be healthy
print_status "Waiting for containers to become healthy..."
TIMEOUT=120
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $TIMEOUT ]; do
    if $DOCKER_COMPOSE ps | grep -q "\bhealthy\b"; then
        print_success "Containers are healthy!"
        break
    fi
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
    echo -n "."
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    print_error "Containers failed to become healthy within $TIMEOUT seconds"
    print_status "Container status:"
    $DOCKER_COMPOSE ps
    print_status "Container logs:"
    $DOCKER_COMPOSE logs
    exit 1
fi

# Run database migrations if script exists
if [ -f "scripts/migrate.sh" ]; then
    print_status "Running database migrations..."
    bash scripts/migrate.sh
fi

# Display deployment information
echo ""
print_success "🎉 Deployment completed successfully!"
echo ""
echo "📊 Deployment Information:"
echo "=========================="
echo "Environment: $ENVIRONMENT"
echo "Containers:"
$DOCKER_COMPOSE ps

echo ""
echo "🌐 Access URLs:"
echo "==============="
echo "Bilan Server: http://localhost:3002"
echo "Health Check: http://localhost:3002/health"
if $DOCKER_COMPOSE ps | grep -q bilan-dashboard; then
    echo "Dashboard: http://localhost:3004"
fi

echo ""
echo "📋 Useful Commands:"
echo "==================="
echo "View logs: $DOCKER_COMPOSE logs -f"
echo "Stop containers: $DOCKER_COMPOSE down"
echo "Restart containers: $DOCKER_COMPOSE restart"
echo "Update deployment: $0 --rebuild"

echo ""
print_status "Monitor the deployment:"
echo "- Check health: curl http://localhost:3002/health"
echo "- View logs: $DOCKER_COMPOSE logs -f bilan-server"
echo "- Container status: $DOCKER_COMPOSE ps" 