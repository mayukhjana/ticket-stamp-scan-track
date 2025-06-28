
-- Add template storage columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS template_image TEXT,
ADD COLUMN IF NOT EXISTS qr_position_x INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS qr_position_y INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS qr_size INTEGER DEFAULT 80;

-- Update the updated_at timestamp when any changes are made
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for events table if it doesn't exist
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
