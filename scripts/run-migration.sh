#!/bin/bash
set -euo pipefail

# Bilan Migration Runner Script
# Safely execute database migrations with rollback support

# Source shared color functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/lib/colors.sh" ]; then
    source "$SCRIPT_DIR/lib/colors.sh"
else
    # Fallback logging functions if colors.sh is missing
    print_error() { echo "ERROR: $1" >&2; }
    print_success() { echo "SUCCESS: $1"; }
    print_status() { echo "INFO: $1"; }
    print_warning() { echo "WARNING: $1" >&2; }
fi

echo "🔄 Running Bilan database migrations..."

# Default values
MIGRATION_DIR="$SCRIPT_DIR/migrations"
DIRECTION="up"
MIGRATION_NAME=""
DB_TYPE="sqlite"
USER_SET_DB_TYPE=false
FORCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--direction)
            if [ -z "${2-}" ]; then
                print_error "Direction argument required for -d|--direction option"
                exit 1
            fi
            DIRECTION="$2"
            # Validate direction value
            if [ "$DIRECTION" != "up" ] && [ "$DIRECTION" != "down" ]; then
                print_error "Invalid direction '$DIRECTION'. Must be 'up' or 'down'"
                exit 1
            fi
            shift 2
            ;;
        -m|--migration)
            if [ -z "${2-}" ]; then
                print_error "Migration name required for -m|--migration option"
                exit 1
            fi
            MIGRATION_NAME="$2"
            shift 2
            ;;
        -t|--type)
            if [ -z "${2-}" ]; then
                print_error "Database type required for -t|--type option"
                exit 1
            fi
            DB_TYPE="$2"
            # Validate database type value
            if [ "$DB_TYPE" != "sqlite" ] && [ "$DB_TYPE" != "postgresql" ]; then
                print_error "Invalid database type '$DB_TYPE'. Must be 'sqlite' or 'postgresql'"
                exit 1
            fi
            USER_SET_DB_TYPE=true
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -d, --direction DIRECTION   Migration direction (up|down) [default: up]"
            echo "  -m, --migration MIGRATION   Specific migration to run"
            echo "  -t, --type TYPE             Database type (sqlite|postgresql) [default: sqlite]"
            echo "  --force                     Force migration without confirmation"
            echo "  -h, --help                  Show this help message"
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

# Validate required environment variables
validate_env_vars() {
    local missing_vars=()
    
    if [ "$DB_TYPE" = "postgresql" ]; then
        if [ -z "${DATABASE_URL:-}" ] && [ -z "${POSTGRES_HOST:-}" ]; then
            missing_vars+=("DATABASE_URL or POSTGRES_HOST")
        fi
        if [ -z "${DATABASE_URL:-}" ] && [ -z "${POSTGRES_DB:-}" ]; then
            missing_vars+=("POSTGRES_DB")
        fi
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            print_error "  - $var"
        done
        print_error "Please check your .env file or environment configuration."
        exit 1
    fi
}

# Set database paths
DB_PATH=${BILAN_DB_PATH:-${DB_PATH:-"./bilan.db"}}

# Check database type (only if user hasn't explicitly set it)
if [ "$USER_SET_DB_TYPE" = false ] && { [ -n "${DATABASE_URL:-}" ] || [ -n "${POSTGRES_HOST:-}" ]; }; then
    DB_TYPE="postgresql"
fi

# Validate environment variables after determining DB_TYPE
validate_env_vars

# Function to run SQLite migration
run_sqlite_migration() {
    local migration_file="$1"
    local migration_name="$2"
    
    if [ ! -f "$migration_file" ]; then
        print_error "Migration file not found: $migration_file"
        return 1
    fi
    
    # Check if sqlite3 is available
    if ! command -v sqlite3 > /dev/null 2>&1; then
        print_error "sqlite3 not found. Please install SQLite3 to run migrations."
        return 1
    fi
    
    print_status "Running SQLite migration: $migration_name"
    
    # Execute migration
    if sqlite3 "$DB_PATH" < "$migration_file"; then
        print_success "Migration completed: $migration_name"
        return 0
    else
        print_error "Migration failed: $migration_name"
        return 1
    fi
}

# Function to run PostgreSQL migration
run_postgresql_migration() {
    local migration_file="$1"
    local migration_name="$2"
    
    if [ ! -f "$migration_file" ]; then
        print_error "Migration file not found: $migration_file"
        return 1
    fi
    
    if ! command -v psql > /dev/null 2>&1; then
        print_error "psql not found. Please install PostgreSQL client tools."
        return 1
    fi
    
    print_status "Running PostgreSQL migration: $migration_name"
    
    # Build psql command arguments array
    local psql_args=("psql")
    
    # Use DATABASE_URL if available, otherwise build from discrete variables
    if [ -n "${DATABASE_URL:-}" ]; then
        psql_args+=("${DATABASE_URL}")
    else
        if [ -n "${POSTGRES_HOST:-}" ]; then
            psql_args+=("-h" "${POSTGRES_HOST}")
        fi
        if [ -n "${POSTGRES_PORT:-}" ]; then
            psql_args+=("-p" "${POSTGRES_PORT}")
        fi
        if [ -n "${POSTGRES_USER:-}" ]; then
            psql_args+=("-U" "${POSTGRES_USER}")
        fi
        if [ -n "${POSTGRES_DB:-}" ]; then
            psql_args+=("-d" "${POSTGRES_DB}")
        fi
    fi
    
    # Add ON_ERROR_STOP
    psql_args+=("-v" "ON_ERROR_STOP=1")
    
    # Execute migration
    if "${psql_args[@]}" < "$migration_file"; then
        print_success "Migration completed: $migration_name"
        return 0
    else
        print_error "Migration failed: $migration_name"
        return 1
    fi
}

# Function to run specific migration
run_migration() {
    local migration_name="$1"
    local direction="$2"
    
    # Determine file extension based on database type
    local file_suffix=""
    if [ "$DB_TYPE" = "postgresql" ]; then
        file_suffix=".postgres"
    fi
    
    # Construct migration file path
    local migration_file="$MIGRATION_DIR/${migration_name}${file_suffix}.${direction}.sql"
    
    # Run migration based on database type
    if [ "$DB_TYPE" = "sqlite" ]; then
        run_sqlite_migration "$migration_file" "$migration_name"
    else
        run_postgresql_migration "$migration_file" "$migration_name"
    fi
}

# Function to validate migration before running
validate_migration() {
    local migration_name="$1"
    local direction="$2"
    
    # Check if migration files exist
    local file_suffix=""
    if [ "$DB_TYPE" = "postgresql" ]; then
        file_suffix=".postgres"
    fi
    
    local migration_file="$MIGRATION_DIR/${migration_name}${file_suffix}.${direction}.sql"
    
    if [ ! -f "$migration_file" ]; then
        print_error "Migration file not found: $migration_file"
        return 1
    fi
    
    print_status "Validating migration: $migration_name ($direction)"
    
    # Basic SQL syntax validation
    if [[ "$migration_file" == *.sql ]]; then
        if ! grep -q "CREATE TABLE\|DROP TABLE\|ALTER TABLE\|CREATE INDEX\|DROP INDEX\|INSERT\|CREATE FUNCTION\|CREATE TRIGGER\|DROP TRIGGER\|DROP FUNCTION" "$migration_file"; then
            print_warning "Migration file may not contain expected SQL operations"
        fi
    fi
    
    return 0
}

# Function to create backup before migration
create_backup() {
    local backup_dir
    backup_dir="backups/migrations/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    if [ "$DB_TYPE" = "sqlite" ] && [ -f "$DB_PATH" ]; then
        cp "$DB_PATH" "$backup_dir/bilan.db.backup"
        print_success "Database backed up to $backup_dir/bilan.db.backup"
    elif [ "$DB_TYPE" = "postgresql" ]; then
        if command -v pg_dump > /dev/null 2>&1; then
            pg_dump "${DATABASE_URL:-}" > "$backup_dir/bilan.sql.backup"
            if [ $? -eq 0 ]; then
                print_success "Database backed up to $backup_dir/bilan.sql.backup"
            else
                print_error "Failed to create PostgreSQL backup"
                return 1
            fi
        else
            print_error "pg_dump not found. Cannot create PostgreSQL backup."
            return 1
        fi
    fi
}

# Main migration logic
main() {
    print_status "Starting migration process..."
    print_status "Database type: $DB_TYPE"
    print_status "Direction: $DIRECTION"
    
    # Create backup before migration
    if [ "$DIRECTION" = "up" ]; then
        create_backup
    fi
    
    # If specific migration is provided, run it
    if [ -n "$MIGRATION_NAME" ]; then
        if validate_migration "$MIGRATION_NAME" "$DIRECTION"; then
            if [ "$FORCE" = false ]; then
                print_warning "About to run migration: $MIGRATION_NAME ($DIRECTION)"
                read -p "Continue? (y/N): " -r
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    print_error "Migration cancelled"
                    exit 1
                fi
            fi
            
            run_migration "$MIGRATION_NAME" "$DIRECTION"
        else
            print_error "Migration validation failed"
            exit 1
        fi
    else
        # Run all migrations in order
        local migrations=("001_create_events_table")
        
        # Reverse order for down migrations to maintain dependency integrity
        if [ "$DIRECTION" = "down" ]; then
            local temp_array=()
            for (( i=${#migrations[@]}-1; i>=0; i-- )); do
                temp_array+=("${migrations[$i]}")
            done
            migrations=("${temp_array[@]}")
        fi
        
        for migration in "${migrations[@]}"; do
            if validate_migration "$migration" "$DIRECTION"; then
                run_migration "$migration" "$DIRECTION"
            else
                print_error "Migration validation failed: $migration"
                exit 1
            fi
        done
    fi
    
    print_success "🎉 Migration process completed successfully!"
}

# Run main function
main 