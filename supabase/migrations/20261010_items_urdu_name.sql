-- ==============================================================================
-- Arki POS: Add urdu_name to items table for product catalog localization
-- Run this in the Supabase SQL Editor to allow product sync with Urdu names.
-- ==============================================================================

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS urdu_name TEXT;
