-- Migration Rollback: 001_create_events_table (PostgreSQL)
-- Description: Rollback unified events table creation for v0.4.0
-- Author: Bilan Database Schema Team
-- Date: 2024-01-17

-- Drop trigger first
DROP TRIGGER IF EXISTS update_events_updated_at ON events;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_events_user_timestamp;
DROP INDEX IF EXISTS idx_events_event_type;
DROP INDEX IF EXISTS idx_events_timestamp;
DROP INDEX IF EXISTS idx_events_user_id;
DROP INDEX IF EXISTS idx_events_created_at;
DROP INDEX IF EXISTS idx_events_properties;

-- Drop events table
DROP TABLE IF EXISTS events;

-- Verify table removal
SELECT 'Events table dropped successfully' AS rollback_status; 