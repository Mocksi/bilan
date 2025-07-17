#!/bin/bash
set -euo pipefail

# Bilan Environment Validation Script
# Validates environment configuration for deployment

echo "✅ Validating Bilan environment configuration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validation counters
ERRORS=0
WARNINGS=0

# Function to add error
add_error() {
    print_error "$1"
    ERRORS=$((ERRORS + 1))
}

# Function to add warning
add_warning() {
    print_warning "$1"
    WARNINGS=$((WARNINGS + 1))
}

# Function to validate required variable
validate_required() {
    local var_name=$1
    local var_value=$2
    local description=$3
    
    if [ -z "$var_value" ]; then
        add_error "Required variable $var_name is not set ($description)"
        return 1
    else
        print_success "$var_name is set"
        return 0
    fi
}

# Function to validate optional variable
validate_optional() {
    local var_name=$1
    local var_value=$2
    local description=$3
    local default_value=$4
    
    if [ -z "$var_value" ]; then
        add_warning "Optional variable $var_name is not set ($description). Using default: $default_value"
        return 1
    else
        print_success "$var_name is set"
        return 0
    fi
}

# Function to validate port number
validate_port() {
    local port=$1
    local var_name=$2
    
    if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
        add_error "$var_name must be a valid port number (1-65535), got: $port"
        return 1
    else
        print_success "$var_name is a valid port: $port"
        return 0
    fi
}

# Function to validate database path
validate_db_path() {
    local db_path=$1
    
    if [ -z "$db_path" ]; then
        add_error "DB_PATH is not set"
        return 1
    fi
    
    # Check if directory exists or can be created
    local db_dir=$(dirname "$db_path")
    if [ ! -d "$db_dir" ]; then
        if mkdir -p "$db_dir" 2>/dev/null; then
            print_success "Database directory created: $db_dir"
        else
            add_error "Cannot create database directory: $db_dir"
            return 1
        fi
    else
        print_success "Database directory exists: $db_dir"
    fi
    
    # Check write permissions
    if [ ! -w "$db_dir" ]; then
        add_error "No write permission for database directory: $db_dir"
        return 1
    fi
    
    return 0
}

# Function to validate URL format
validate_url() {
    local url=$1
    local var_name=$2
    
    if [[ ! "$url" =~ ^https?:// ]]; then
        add_error "$var_name must be a valid URL starting with http:// or https://, got: $url"
        return 1
    else
        print_success "$var_name is a valid URL"
        return 0
    fi
}

# Function to check if command exists
check_command() {
    local cmd=$1
    local description=$2
    
    if command -v "$cmd" > /dev/null 2>&1; then
        print_success "$description is available: $(which "$cmd")"
        return 0
    else
        add_warning "$description is not available: $cmd"
        return 1
    fi
}

# Load environment variables
if [ -f ".env" ]; then
    set -o allexport
    source .env
    set +o allexport
    print_status "Loaded environment variables from .env file"
else
    print_status "No .env file found, using system environment variables"
fi

# Start validation
print_status "Starting environment validation..."
echo ""

# 1. Core Server Configuration
echo "🔧 Core Server Configuration:"
echo "=============================="
validate_optional "BILAN_NODE_ENV" "$BILAN_NODE_ENV" "Node.js environment" "production"
validate_required "BILAN_PORT" "$BILAN_PORT" "Server port"
if [ -n "$BILAN_PORT" ]; then
    validate_port "$BILAN_PORT" "BILAN_PORT"
fi

# 2. Database Configuration
echo ""
echo "🗄️  Database Configuration:"
echo "============================"
if [ -n "$DATABASE_URL" ] || [ -n "$POSTGRES_HOST" ]; then
    print_status "PostgreSQL database configuration detected"
    validate_required "DATABASE_URL" "$DATABASE_URL" "PostgreSQL connection string"
    
    # Check PostgreSQL tools
    check_command "psql" "PostgreSQL client"
    check_command "pg_dump" "PostgreSQL backup tool"
else
    print_status "SQLite database configuration detected"
    validate_required "BILAN_DB_PATH" "$BILAN_DB_PATH" "SQLite database path"
    if [ -n "$BILAN_DB_PATH" ]; then
        validate_db_path "$BILAN_DB_PATH"
    fi
    
    # Check SQLite tools
    check_command "sqlite3" "SQLite client"
fi

# 3. Security Configuration
echo ""
echo "🔒 Security Configuration:"
echo "=========================="
validate_optional "BILAN_SESSION_SECRET" "$BILAN_SESSION_SECRET" "Session secret key" "random-generated-key"
validate_optional "BILAN_JWT_SECRET" "$BILAN_JWT_SECRET" "JWT secret key" "random-generated-key"

# Check for default/weak secrets
if [ "$BILAN_SESSION_SECRET" = "<CHANGE_ME>" ]; then
    add_error "BILAN_SESSION_SECRET is set to placeholder value. Please change it for production."
fi

if [ "$BILAN_JWT_SECRET" = "<CHANGE_ME>" ]; then
    add_error "BILAN_JWT_SECRET is set to placeholder value. Please change it for production."
fi

# 4. CORS Configuration
echo ""
echo "🌐 CORS Configuration:"
echo "======================"
validate_optional "BILAN_CORS_ORIGIN" "$BILAN_CORS_ORIGIN" "CORS allowed origins" "http://localhost:3004"
validate_optional "BILAN_CORS_CREDENTIALS" "$BILAN_CORS_CREDENTIALS" "CORS credentials support" "true"

# 5. Performance Configuration
echo ""
echo "⚡ Performance Configuration:"
echo "============================="
validate_optional "BILAN_RATE_LIMIT_MAX" "$BILAN_RATE_LIMIT_MAX" "Rate limit maximum requests" "100"
validate_optional "BILAN_RATE_LIMIT_WINDOW" "$BILAN_RATE_LIMIT_WINDOW" "Rate limit time window" "60000"

# 6. Logging Configuration
echo ""
echo "📝 Logging Configuration:"
echo "========================="
validate_optional "BILAN_LOG_LEVEL" "$BILAN_LOG_LEVEL" "Log level" "info"
validate_optional "BILAN_LOG_FILE" "$BILAN_LOG_FILE" "Log file path" "./logs/bilan.log"

# Check if log directory exists
if [ -n "$BILAN_LOG_FILE" ]; then
    log_dir=$(dirname "$BILAN_LOG_FILE")
    if [ ! -d "$log_dir" ]; then
        if mkdir -p "$log_dir" 2>/dev/null; then
            print_success "Log directory created: $log_dir"
        else
            add_warning "Cannot create log directory: $log_dir"
        fi
    fi
fi

# 7. Dashboard Configuration
echo ""
echo "📊 Dashboard Configuration:"
echo "==========================="
validate_optional "NEXT_PUBLIC_API_BASE_URL" "$NEXT_PUBLIC_API_BASE_URL" "Dashboard API base URL" "http://localhost:3002"
if [ -n "$NEXT_PUBLIC_API_BASE_URL" ]; then
    validate_url "$NEXT_PUBLIC_API_BASE_URL" "NEXT_PUBLIC_API_BASE_URL"
fi

# 8. Docker Configuration
echo ""
echo "🐳 Docker Configuration:"
echo "========================"
validate_optional "BILAN_DOCKER_DATA_PATH" "$BILAN_DOCKER_DATA_PATH" "Docker data volume path" "/app/data"

# 9. System Dependencies
echo ""
echo "⚙️  System Dependencies:"
echo "======================="
check_command "node" "Node.js runtime"
check_command "npm" "NPM package manager"
check_command "docker" "Docker runtime"
check_command "docker-compose" "Docker Compose" || check_command "docker" "Docker with compose plugin"

# 10. File Permissions
echo ""
echo "📁 File Permissions:"
echo "==================="
if [ ! -r "package.json" ]; then
    add_error "Cannot read package.json"
fi

if [ ! -r "docker-compose.yml" ]; then
    add_error "Cannot read docker-compose.yml"
fi

if [ ! -r "Dockerfile" ]; then
    add_error "Cannot read Dockerfile"
fi

# 11. Network Connectivity (optional)
echo ""
echo "🌍 Network Connectivity:"
echo "======================="
if command -v curl > /dev/null 2>&1; then
    if curl -s --connect-timeout 5 http://httpbin.org/status/200 > /dev/null 2>&1; then
        print_success "Internet connectivity is available"
    else
        add_warning "Internet connectivity test failed (may affect Docker image pulls)"
    fi
else
    add_warning "curl not available, skipping connectivity check"
fi

# 12. Resource Checks
echo ""
echo "💾 Resource Checks:"
echo "=================="
if command -v df > /dev/null 2>&1; then
    disk_usage=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        add_warning "Disk usage is high: ${disk_usage}%"
    else
        print_success "Disk usage is acceptable: ${disk_usage}%"
    fi
fi

if command -v free > /dev/null 2>&1; then
    memory_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100}')
    if [ "$memory_usage" -gt 90 ]; then
        add_warning "Memory usage is high: ${memory_usage}%"
    else
        print_success "Memory usage is acceptable: ${memory_usage}%"
    fi
fi

# Summary
echo ""
echo "📋 Validation Summary:"
echo "====================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    print_success "🎉 All validation checks passed! Environment is ready for deployment."
    exit 0
elif [ $ERRORS -eq 0 ]; then
    print_warning "⚠️  Validation completed with $WARNINGS warning(s). Review and consider fixing."
    exit 0
else
    print_error "❌ Validation failed with $ERRORS error(s) and $WARNINGS warning(s)."
    echo ""
    echo "Please fix the errors above before deploying."
    exit 1
fi 