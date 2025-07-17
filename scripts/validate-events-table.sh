#!/bin/bash
set -euo pipefail

# Bilan Events Table Validation Script
# Validates the integrity and structure of the events table

# Source shared color functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/colors.sh"

echo "🔍 Validating Bilan events table..."

# Load environment variables
if [ -f ".env" ]; then
    set -a
    source .env
    set +a
fi

# Set database paths
DB_PATH=${BILAN_DB_PATH:-${DB_PATH:-"./bilan.db"}}

# Check database type
if [ -n "${DATABASE_URL:-}" ] || [ -n "${POSTGRES_HOST:-}" ]; then
    DB_TYPE="postgresql"
else
    DB_TYPE="sqlite"
fi

# Function to run SQLite validation
validate_sqlite() {
    local db_path="$1"
    
    if [ ! -f "$db_path" ]; then
        print_error "Database file not found: $db_path"
        return 1
    fi
    
    print_status "Validating SQLite database: $db_path"
    
    # Check if events table exists
    local table_exists
    table_exists=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='events';")
    if [ $? -ne 0 ]; then
        print_error "Failed to check if events table exists"
        return 1
    fi
    if [ "$table_exists" -ne 1 ]; then
        print_error "Events table not found"
        return 1
    fi
    print_success "✓ Events table exists"
    
    # Check table structure
    print_status "Checking table structure..."
    local columns
    columns=$(sqlite3 "$db_path" "PRAGMA table_info(events);")
    if [ $? -ne 0 ]; then
        print_error "Failed to get table structure"
        return 1
    fi
    
    # Verify required columns exist
    local required_columns=("event_id" "user_id" "event_type" "timestamp" "properties")
    for column in "${required_columns[@]}"; do
        if echo "$columns" | grep -q "$column"; then
            print_success "✓ Column exists: $column"
        else
            print_error "✗ Missing column: $column"
            return 1
        fi
    done
    
    # Check indexes
    print_status "Checking indexes..."
    local indexes
    indexes=$(sqlite3 "$db_path" "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='events';")
    if [ $? -ne 0 ]; then
        print_error "Failed to get indexes"
        return 1
    fi
    
    local required_indexes=("idx_events_user_timestamp" "idx_events_event_type" "idx_events_timestamp" "idx_events_user_id")
    for index in "${required_indexes[@]}"; do
        if echo "$indexes" | grep -q "$index"; then
            print_success "✓ Index exists: $index"
        else
            print_error "✗ Missing index: $index"
            return 1
        fi
    done
    
    # Validate constraints
    print_status "Validating constraints..."
    
    # Test invalid event type (should fail)
    local constraint_test
    constraint_test=$(sqlite3 "$db_path" "INSERT INTO events (event_id, user_id, event_type, timestamp, properties) VALUES ('test', 'user1', 'invalid_type', 123456789, '{}');" 2>&1 || true)
    if echo "$constraint_test" | grep -q "constraint failed"; then
        print_success "✓ Event type constraint working"
    else
        print_error "✗ Event type constraint not working"
        return 1
    fi
    
    # Test invalid timestamp (should fail)
    local timestamp_test
    timestamp_test=$(sqlite3 "$db_path" "INSERT INTO events (event_id, user_id, event_type, timestamp, properties) VALUES ('test2', 'user1', 'vote_cast', -1, '{}');" 2>&1 || true)
    if echo "$timestamp_test" | grep -q "constraint failed"; then
        print_success "✓ Timestamp constraint working"
    else
        print_error "✗ Timestamp constraint not working"
        return 1
    fi
    
    # Test invalid JSON (should fail)
    local json_test
    json_test=$(sqlite3 "$db_path" "INSERT INTO events (event_id, user_id, event_type, timestamp, properties) VALUES ('test3', 'user1', 'vote_cast', 123456789, 'invalid json');" 2>&1 || true)
    if echo "$json_test" | grep -q "constraint failed"; then
        print_success "✓ JSON constraint working"
    else
        print_error "✗ JSON constraint not working"
        return 1
    fi
    
    # Test valid insertion
    local valid_test
    valid_test=$(sqlite3 "$db_path" "INSERT INTO events (event_id, user_id, event_type, timestamp, properties) VALUES ('test_valid', 'user1', 'vote_cast', 123456789, '{\"test\": true}');" 2>&1 || true)
    if [ -z "$valid_test" ]; then
        print_success "✓ Valid insertion working"
        # Clean up test data
        sqlite3 "$db_path" "DELETE FROM events WHERE event_id = 'test_valid';"
    else
        print_error "✗ Valid insertion failed: $valid_test"
        return 1
    fi
    
    # Performance check
    print_status "Running performance check..."
    local explain_query
    explain_query=$(sqlite3 "$db_path" "EXPLAIN QUERY PLAN SELECT * FROM events WHERE user_id = 'test' AND timestamp > 123456789;")
    if [ $? -ne 0 ]; then
        print_error "Failed to run explain query"
        return 1
    fi
    if echo "$explain_query" | grep -q "idx_events_user_timestamp"; then
        print_success "✓ Query uses proper index"
    else
        print_warning "⚠ Query may not be using optimal index"
    fi
    
    return 0
}

# Function to run PostgreSQL validation
validate_postgresql() {
    if ! command -v psql > /dev/null 2>&1; then
        print_error "psql not found. Please install PostgreSQL client tools."
        return 1
    fi
    
    print_status "Validating PostgreSQL database"
    
    # Check if events table exists
    local table_exists
    table_exists=$(psql "${DATABASE_URL:-}" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='events';" -t 2>/dev/null || echo "0")
    if [ "$table_exists" -ne 1 ]; then
        print_error "Events table not found"
        return 1
    fi
    print_success "✓ Events table exists"
    
    # Check table structure
    print_status "Checking table structure..."
    local columns
    columns=$(psql "${DATABASE_URL:-}" -c "SELECT column_name FROM information_schema.columns WHERE table_name='events';" -t 2>/dev/null || echo "")
    
    # Verify required columns exist
    local required_columns=("event_id" "user_id" "event_type" "timestamp" "properties")
    for column in "${required_columns[@]}"; do
        if echo "$columns" | grep -q "$column"; then
            print_success "✓ Column exists: $column"
        else
            print_error "✗ Missing column: $column"
            return 1
        fi
    done
    
    # Check indexes
    print_status "Checking indexes..."
    local indexes
    indexes=$(psql "${DATABASE_URL:-}" -c "SELECT indexname FROM pg_indexes WHERE tablename='events';" -t 2>/dev/null || echo "")
    
    local required_indexes=("idx_events_user_timestamp" "idx_events_event_type" "idx_events_timestamp" "idx_events_user_id")
    for index in "${required_indexes[@]}"; do
        if echo "$indexes" | grep -q "$index"; then
            print_success "✓ Index exists: $index"
        else
            print_error "✗ Missing index: $index"
            return 1
        fi
    done
    
    # Validate constraints
    print_status "Validating constraints..."
    
    # Test invalid event type (should fail)
    local constraint_test
    constraint_test=$(psql "${DATABASE_URL:-}" -c "INSERT INTO events (event_id, user_id, event_type, timestamp, properties) VALUES ('test', 'user1', 'invalid_type', 123456789, '{}');" 2>&1 || true)
    if echo "$constraint_test" | grep -q "constraint"; then
        print_success "✓ Event type constraint working"
    else
        print_error "✗ Event type constraint not working"
        return 1
    fi
    
    # Test invalid timestamp (should fail)
    local timestamp_test
    timestamp_test=$(psql "${DATABASE_URL:-}" -c "INSERT INTO events (event_id, user_id, event_type, timestamp, properties) VALUES ('test2', 'user1', 'vote_cast', -1, '{}');" 2>&1 || true)
    if echo "$timestamp_test" | grep -q "constraint"; then
        print_success "✓ Timestamp constraint working"
    else
        print_error "✗ Timestamp constraint not working"
        return 1
    fi
    
    # Test invalid JSON (should fail)
    local json_test
    json_test=$(psql "${DATABASE_URL:-}" -c "INSERT INTO events (event_id, user_id, event_type, timestamp, properties) VALUES ('test3', 'user1', 'vote_cast', 123456789, 'invalid json');" 2>&1 || true)
    if echo "$json_test" | grep -q "constraint\|invalid"; then
        print_success "✓ JSON constraint working"
    else
        print_error "✗ JSON constraint not working"
        return 1
    fi
    
    # Test valid insertion
    local valid_test
    valid_test=$(psql "${DATABASE_URL:-}" -c "INSERT INTO events (event_id, user_id, event_type, timestamp, properties) VALUES ('test_valid', 'user1', 'vote_cast', 123456789, '{\"test\": true}');" 2>&1 || true)
    if [ -z "$valid_test" ]; then
        print_success "✓ Valid insertion working"
        # Clean up test data
        psql "${DATABASE_URL:-}" -c "DELETE FROM events WHERE event_id = 'test_valid';" >/dev/null 2>&1
    else
        print_error "✗ Valid insertion failed: $valid_test"
        return 1
    fi
    
    return 0
}

# Main validation logic
main() {
    print_status "Starting events table validation..."
    print_status "Database type: $DB_TYPE"
    
    if [ "$DB_TYPE" = "sqlite" ]; then
        if validate_sqlite "$DB_PATH"; then
            print_success "✅ SQLite events table validation passed"
        else
            print_error "❌ SQLite events table validation failed"
            exit 1
        fi
    else
        if validate_postgresql; then
            print_success "✅ PostgreSQL events table validation passed"
        else
            print_error "❌ PostgreSQL events table validation failed"
            exit 1
        fi
    fi
    
    print_success "🎉 Events table validation completed successfully!"
    echo ""
    echo "📊 Validation Summary:"
    echo "======================"
    echo "✓ Table structure verified"
    echo "✓ Required columns present"
    echo "✓ Indexes created and functional"
    echo "✓ Constraints working properly"
    echo "✓ Data insertion/validation working"
    echo "✓ Performance indexes operational"
}

# Run main function
main 