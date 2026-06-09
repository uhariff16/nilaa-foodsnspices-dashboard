-- Update item_master category check constraint to allow 'Charges' and 'Overhead'
ALTER TABLE public.item_master 
DROP CONSTRAINT IF EXISTS item_master_category_check;

ALTER TABLE public.item_master 
ADD CONSTRAINT item_master_category_check 
CHECK (category IN ('Raw Material', 'Processed Item', 'Charges', 'Overhead'));
