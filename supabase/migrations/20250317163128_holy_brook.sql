/*
  # Add admin role to profiles

  1. Changes
    - Add `is_admin` column to profiles table
    - Set default value to false
    - Add policy for admin users
    - Update your profile to be an admin

  2. Security
    - Only admins can update other profiles' admin status
    - Regular users cannot modify admin status
*/

-- Add is_admin column
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Create policy for admin users
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
    OR id = auth.uid()
  );

-- Make your profile an admin
UPDATE profiles 
SET is_admin = true 
WHERE id = auth.uid();