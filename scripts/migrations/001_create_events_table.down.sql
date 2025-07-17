-- Migration Rollback: 001_create_events_table
-- Description: Rollback unified events table creation for v0.4.0
-- Author: Bilan Database Schema Team
-- Date: 2024-01-17

-- Drop triggers first
DROP TRIGGER IF EXISTS update_events_updated_at;

-- Drop indexes
DROP INDEX IF EXISTS idx_events_user_timestamp;
DROP INDEX IF EXISTS idx_events_event_type;
DROP INDEX IF EXISTS idx_events_timestamp;
DROP INDEX IF EXISTS idx_events_user_id;
DROP INDEX IF EXISTS idx_events_created_at;

-- Drop events table
DROP TABLE IF EXISTS events;

-- Verify table removal
SELECT 'Events table dropped successfully' AS rollback_status; 