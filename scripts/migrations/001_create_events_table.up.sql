-- Migration: 001_create_events_table
-- Description: Create unified events table for v0.4.0 event-based architecture
-- Author: Bilan Database Schema Team
-- Date: 2024-01-17

-- Enable foreign key support for SQLite
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
    ai_response TEXT,
    
    -- Metadata for tracking
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance (time-series optimized)
CREATE INDEX IF NOT EXISTS idx_events_user_timestamp ON events(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_events_updated_at 
    AFTER UPDATE ON events
    FOR EACH ROW 
    BEGIN
        UPDATE events SET updated_at = CURRENT_TIMESTAMP WHERE event_id = NEW.event_id;
    END;

-- Verify table creation
SELECT 'Events table created successfully' AS migration_status; 