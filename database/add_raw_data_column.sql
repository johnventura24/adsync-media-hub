-- Add raw_data column to scorecards table to store original CSV data
ALTER TABLE scorecards ADD COLUMN IF NOT EXISTS raw_data JSONB;

-- Add comment explaining the column
COMMENT ON COLUMN scorecards.raw_data IS 'Stores original CSV data as JSON for flexible data import';
