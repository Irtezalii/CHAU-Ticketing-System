-- Migration: Every attachment upload also creates a chat message so it shows
-- up inline in the live chat for both the submitter and the agent.
ALTER TABLE ticket_messages ADD COLUMN attachment_id INTEGER REFERENCES ticket_attachments(id);
