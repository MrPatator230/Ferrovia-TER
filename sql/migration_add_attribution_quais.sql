-- Migration: Add attribution_quais column to horaires table
-- This column will store platform assignments keyed by station code

ALTER TABLE horaires 
ADD COLUMN IF NOT EXISTS attribution_quais JSON DEFAULT NULL 
COMMENT 'Attributions de quais par code de gare (ex: {"DIJ": "3A", "SEU": "4B"})';
