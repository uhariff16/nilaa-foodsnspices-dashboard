-- Add can_access_payouts column to user_roles
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS can_access_payouts BOOLEAN DEFAULT false;

-- Update existing admins to have payout access
UPDATE user_roles SET can_access_payouts = true WHERE role = 'admin';
