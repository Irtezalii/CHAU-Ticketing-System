-- Migration: Add lead phone number column
ALTER TABLE tickets ADD COLUMN lead_phone TEXT;
