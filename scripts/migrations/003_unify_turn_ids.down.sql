-- Migration Rollback: 003_unify_turn_ids
-- Description: Rollback turn_id unification - restore promptId format
-- Author: Bilan v0.4.1 Development Team
-- Date: 2024-01-18

-- Log rollback start
INSERT INTO events (event_id, user_id, event_type, timestamp, properties) 
VALUES (
  'migration_003_rollback_' || strftime('%s', 'now') || '_' || abs(random() % 1000),
  'system',
  'user_action',
  strftime('%s', 'now') * 1000,
  json_object(
    'migration', '003_unify_turn_ids',
    'phase', 'rollback_start',
    'vote_events_before_rollback', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast'),
    'votes_with_turn_id', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast' AND JSON_EXTRACT(properties, '$.turn_id') IS NOT NULL)
  )
);

-- Restore vote events from backup if available
-- Note: We only need to restore vote_cast events since non-vote events weren't modified

-- Delete current vote events
DELETE FROM events WHERE event_type = 'vote_cast';

-- Restore vote events from backup table
INSERT INTO events 
SELECT * FROM vote_events_backup 
WHERE event_type = 'vote_cast';

-- Note: Non-vote events are already in the events table and don't need restoration
-- since they were never modified during the forward migration

-- Log rollback completion
INSERT INTO events (event_id, user_id, event_type, timestamp, properties) 
VALUES (
  'migration_003_rollback_complete_' || strftime('%s', 'now') || '_' || abs(random() % 1000),
  'system',
  'user_action',
  strftime('%s', 'now') * 1000,
  json_object(
    'migration', '003_unify_turn_ids',
    'phase', 'rollback_complete',
    'vote_events_restored', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast'),
    'votes_with_promptId', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast' AND JSON_EXTRACT(properties, '$.promptId') IS NOT NULL)
  )
);

-- Verify rollback
SELECT 
  'Rollback 003 Results:' as status,
  COUNT(*) as total_votes,
  COUNT(CASE WHEN JSON_EXTRACT(properties, '$.promptId') IS NOT NULL THEN 1 END) as votes_with_promptId,
  COUNT(CASE WHEN JSON_EXTRACT(properties, '$.turn_id') IS NOT NULL THEN 1 END) as votes_with_turn_id_remaining,
  CASE 
    WHEN COUNT(CASE WHEN JSON_EXTRACT(properties, '$.promptId') IS NOT NULL THEN 1 END) > 0 
    THEN 'ROLLBACK_SUCCESS' 
    ELSE 'ROLLBACK_FAILED' 
  END as rollback_status
FROM events 
WHERE event_type = 'vote_cast'; 