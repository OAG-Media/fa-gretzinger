-- Add missing columns to repair_orders table
ALTER TABLE repair_orders 
ADD COLUMN IF NOT EXISTS gesendet_an_werkstatt DATE,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS kv_date DATE,
ADD COLUMN IF NOT EXISTS per_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS werkstatt_notiz TEXT,
ADD COLUMN IF NOT EXISTS werkstatt_date DATE,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Update existing records to have version 1
UPDATE repair_orders SET version = 1 WHERE version IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN repair_orders.gesendet_an_werkstatt IS 'Date when repair order was sent to workshop';
COMMENT ON COLUMN repair_orders.notes IS 'General notes field for additional information';
COMMENT ON COLUMN repair_orders.kv_date IS 'Date of KV (Kostenvoranschlag)';
COMMENT ON COLUMN repair_orders.per_method IS 'Method of communication (Fax, Mail, etc.)';
COMMENT ON COLUMN repair_orders.werkstatt_notiz IS 'Workshop notes and instructions';
COMMENT ON COLUMN repair_orders.werkstatt_date IS 'Workshop date';
COMMENT ON COLUMN repair_orders.version IS 'Version number for tracking changes';
COMMENT ON COLUMN repair_orders.archived IS 'Archive flag for soft deletion';
