-- Migration: 002_flexible_relationships ROLLBACK
-- Description: Remove flexible relationship fields for v0.4.1 contextual analytics (ClickHouse)
-- Author: Bilan v0.4.1 Development Team  
-- Date: 2024-01-18

-- Remove data skipping indexes first (ClickHouse-specific)
ALTER TABLE events DROP INDEX IF EXISTS idx_journey_timestamp;
ALTER TABLE events DROP INDEX IF EXISTS idx_conversation_sequence;
ALTER TABLE events DROP INDEX IF EXISTS idx_turn_context;

-- Remove the relationship columns (ClickHouse syntax)
ALTER TABLE events DROP COLUMN IF EXISTS journey_id;
ALTER TABLE events DROP COLUMN IF EXISTS conversation_id;
ALTER TABLE events DROP COLUMN IF EXISTS turn_sequence;
ALTER TABLE events DROP COLUMN IF EXISTS turn_id;

-- Verify rollback completion
SELECT 
  name,
  type,
  default_expression
FROM system.columns 
WHERE database = currentDatabase() 
  AND table = 'events'
  AND name IN ('journey_id', 'conversation_id', 'turn_sequence', 'turn_id')
ORDER BY name;

-- Should return no rows if rollback was successful 