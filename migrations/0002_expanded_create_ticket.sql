-- Migration: Expand tickets schema for structured fields and reference IDs
ALTER TABLE tickets ADD COLUMN ticket_ref TEXT;
ALTER TABLE tickets ADD COLUMN main_description TEXT;
ALTER TABLE tickets ADD COLUMN expected_behavior TEXT;
ALTER TABLE tickets ADD COLUMN impact TEXT;
ALTER TABLE tickets ADD COLUMN callback_phone TEXT;
ALTER TABLE tickets ADD COLUMN platform_area TEXT;
ALTER TABLE tickets ADD COLUMN workspace_kind TEXT;
ALTER TABLE tickets ADD COLUMN workspace_name TEXT;
ALTER TABLE tickets ADD COLUMN workspace_use TEXT;
ALTER TABLE tickets ADD COLUMN needed_by TEXT;
ALTER TABLE tickets ADD COLUMN campaign_name TEXT;
ALTER TABLE tickets ADD COLUMN campaign_goal TEXT;
ALTER TABLE tickets ADD COLUMN go_live_date TEXT;
ALTER TABLE tickets ADD COLUMN timeframe TEXT;
