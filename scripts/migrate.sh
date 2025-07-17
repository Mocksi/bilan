#!/bin/bash
set -euo pipefail

# Bilan Database Migration Script
# Handles database initialization and migrations

# Source shared color functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/colors.sh"

echo "🗄️  Running Bilan database migrations..."

# Default values
ENVIRONMENT="production"
FORCE_RESET=false
BACKUP_BEFORE_MIGRATION=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            if [ -z "${2-}" ]; then
                print_error "Environment argument required for -e|--env option"
                exit 1
            fi
            ENVIRONMENT="$2"
            shift 2
            ;;
        --force-reset)
            FORCE_RESET=true
            shift
            ;;
        --no-backup)
            BACKUP_BEFORE_MIGRATION=false
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --env ENVIRONMENT    Set environment (development|production) [default: production]"
            echo "  --force-reset           Reset database (WARNING: destroys all data)"
            echo "  --no-backup             Skip backup before migration"
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

# Load environment variables
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# Set default database path if not provided
DB_PATH=${BILAN_DB_PATH:-${DB_PATH:-"./bilan.db"}}

# Check database type
if [ -n "${DATABASE_URL:-}" ] || [ -n "${POSTGRES_HOST:-}" ]; then
    DB_TYPE="postgresql"
    print_status "Using PostgreSQL database"
    
    # If DATABASE_URL is not set but POSTGRES_HOST is set, construct DATABASE_URL
    if [ -z "${DATABASE_URL:-}" ] && [ -n "${POSTGRES_HOST:-}" ]; then
        POSTGRES_PORT=${POSTGRES_PORT:-5432}
        POSTGRES_DB=${POSTGRES_DB:-bilan}
        POSTGRES_USER=${POSTGRES_USER:-bilan}
        
        if [ -n "${POSTGRES_PASSWORD:-}" ]; then
            DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
        else
            DATABASE_URL="postgresql://${POSTGRES_USER}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
        fi
        print_status "Constructed DATABASE_URL from split variables"
    fi
else
    DB_TYPE="sqlite"
    print_status "Using SQLite database at: $DB_PATH"
fi

# Function to check if database exists
check_database_exists() {
    if [ "$DB_TYPE" = "sqlite" ]; then
        [ -f "$DB_PATH" ]
    else
        # For PostgreSQL, check if we can connect
        if command -v psql > /dev/null 2>&1; then
            psql "${DATABASE_URL:-}" -c "SELECT 1;" > /dev/null 2>&1
        else
            print_error "psql not found. Please install PostgreSQL client tools."
            exit 1
        fi
    fi
}

# Function to backup database
backup_database() {
    if [ "$BACKUP_BEFORE_MIGRATION" = false ]; then
        return 0
    fi
    
    print_status "Creating database backup..."
    BACKUP_DIR="backups/db/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    if [ "$DB_TYPE" = "sqlite" ] && [ -f "$DB_PATH" ]; then
        cp "$DB_PATH" "$BACKUP_DIR/bilan.db.backup"
        print_success "SQLite database backed up to $BACKUP_DIR/bilan.db.backup"
    elif [ "$DB_TYPE" = "postgresql" ]; then
        if command -v pg_dump > /dev/null 2>&1; then
            pg_dump "${DATABASE_URL:-}" > "$BACKUP_DIR/bilan.sql"
            print_success "PostgreSQL database backed up to $BACKUP_DIR/bilan.sql"
        else
            print_warning "pg_dump not found, skipping PostgreSQL backup"
        fi
    fi
}

# Function to initialize SQLite database
init_sqlite_database() {
    print_status "Initializing SQLite database..."
    
    # Create database directory if it doesn't exist
    DB_DIR=$(dirname "$DB_PATH")
    mkdir -p "$DB_DIR"
    
    # Create tables using SQL
    sqlite3 "$DB_PATH" << 'EOF'
-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Create unified events table (v0.4.0)
CREATE TABLE IF NOT EXISTS events (
    event_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'turn_created', 'turn_completed', 'turn_failed',
        'user_action', 'vote_cast', 'journey_step',
        'conversation_started', 'conversation_ended',
        'regeneration_requested', 'frustration_detected'
    )),
    timestamp BIGINT NOT NULL CHECK (timestamp > 0),
    properties TEXT NOT NULL DEFAULT '{}' CHECK (JSON_VALID(properties)),
    prompt_text TEXT,
    ai_response TEXT
);

-- Create indexes for performance (time-series optimized)
CREATE INDEX IF NOT EXISTS idx_events_user_timestamp ON events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
EOF
    
    print_success "SQLite database initialized successfully"
}

# Function to initialize PostgreSQL database
init_postgresql_database() {
    print_status "Initializing PostgreSQL database..."
    
    if ! command -v psql > /dev/null 2>&1; then
        print_error "psql not found. Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Create tables using SQL
    psql "${DATABASE_URL:-}" << 'EOF'
-- Create unified events table (v0.4.0)
CREATE TABLE IF NOT EXISTS events (
    event_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL CHECK (event_type IN (
        'turn_created', 'turn_completed', 'turn_failed',
        'user_action', 'vote_cast', 'journey_step',
        'conversation_started', 'conversation_ended',
        'regeneration_requested', 'frustration_detected'
    )),
    timestamp BIGINT NOT NULL CHECK (timestamp > 0),
    properties JSONB NOT NULL DEFAULT '{}',
    prompt_text TEXT,
    ai_response TEXT
);

-- Create indexes for performance (time-series optimized)
CREATE INDEX IF NOT EXISTS idx_events_user_timestamp ON events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
EOF
    
    print_success "PostgreSQL database initialized successfully"
}

# Function to reset database
reset_database() {
    if [ "$FORCE_RESET" = false ]; then
        return 0
    fi
    
    print_warning "⚠️  FORCE RESET: This will destroy all data in the database!"
    
    if [ "$DB_TYPE" = "sqlite" ]; then
        if [ -f "$DB_PATH" ]; then
            rm "$DB_PATH"
            print_success "SQLite database reset"
        fi
    else
        print_error "PostgreSQL reset not implemented for safety. Please reset manually."
        exit 1
    fi
}

# Main migration logic
main() {
    print_status "Starting database migration for environment: $ENVIRONMENT"
    
    # Check if database exists
    if check_database_exists; then
        print_status "Database exists, checking for migrations..."
        
        # Backup before migration
        backup_database
        
        # Reset if requested
        reset_database
    else
        print_status "Database does not exist, creating new database..."
    fi
    
    # Initialize database
    if [ "$DB_TYPE" = "sqlite" ]; then
        init_sqlite_database
    else
        init_postgresql_database
    fi
    
    # Verify database initialization
    if [ "$DB_TYPE" = "sqlite" ]; then
        if [ -f "$DB_PATH" ]; then
            # Check if events table exists
            events_table_exists=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='events';")
            if [ "$events_table_exists" -eq 1 ]; then
                print_success "Database verification passed: events table created"
            else
                print_error "Database verification failed: events table not found"
                exit 1
            fi
        else
            print_error "Database file not found after initialization"
            exit 1
        fi
    else
        print_success "PostgreSQL database migration completed"
    fi
    
    print_success "🎉 Database migration completed successfully!"
    echo ""
    echo "📊 Database Information:"
    echo "========================"
    echo "Type: $DB_TYPE"
    if [ "$DB_TYPE" = "sqlite" ]; then
        echo "Path: $DB_PATH"
        echo "Size: $(du -h "$DB_PATH" | cut -f1)"
    else
        echo "URL: ${DATABASE_URL:-}"
    fi
}

# Run main function
main 