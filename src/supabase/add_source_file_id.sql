-- Add source_file_id to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS source_file_id text;

-- Add source_file_id to production_logs table
ALTER TABLE public.production_logs 
ADD COLUMN IF NOT EXISTS source_file_id text;

-- Add index for performance (since we will delete by this ID)
CREATE INDEX IF NOT EXISTS idx_transactions_source_file ON public.transactions(source_file_id);
CREATE INDEX IF NOT EXISTS idx_production_source_file ON public.production_logs(source_file_id);
