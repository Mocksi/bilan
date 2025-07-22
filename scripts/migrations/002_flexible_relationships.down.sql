-- Migration Rollback: 002_flexible_relationships
-- Description: Rollback flexible relationship fields for v0.4.1
-- Author: Bilan v0.4.1 Development Team
-- Date: 2024-01-18

-- Drop relationship indexes first
DROP INDEX IF EXISTS idx_events_journey;
DROP INDEX IF EXISTS idx_events_conversation;
DROP INDEX IF EXISTS idx_events_turn_context;

-- Remove relationship columns from events table
ALTER TABLE events DROP COLUMN journey_id;
ALTER TABLE events DROP COLUMN conversation_id;
ALTER TABLE events DROP COLUMN turn_sequence;
ALTER TABLE events DROP COLUMN turn_id;

-- Verify columns removed
SELECT 'Flexible relationship fields removed successfully' AS rollback_status; 