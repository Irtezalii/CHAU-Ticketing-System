ALTER TABLE tickets ADD COLUMN notion_page_id TEXT;
CREATE INDEX idx_tickets_notion_page_id ON tickets(notion_page_id);

ALTER TABLE ticket_messages ADD COLUMN notion_comment_id TEXT;
CREATE UNIQUE INDEX idx_ticket_messages_notion_comment_id
  ON ticket_messages(notion_comment_id) WHERE notion_comment_id IS NOT NULL;
