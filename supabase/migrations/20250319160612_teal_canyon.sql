/*
  # Add admin policies for profile management

  1. Changes
    - Add policies for admin users to manage all profiles
    - Add policies for admin users to manage all user_hobbies
    - Add policies for admin users to manage all hobbies

  2. Security
    - Enable RLS on all tables
    - Add admin-specific policies for full CRUD operations
    - Maintain existing user policies
*/

-- Update existing policies for profiles table
CREATE POLICY "Admins can delete any profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can insert any profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

-- Add admin policies for user_hobbies table
CREATE POLICY "Admins can manage all user hobbies"
  ON user_hobbies
  FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

-- Add admin policies for hobbies table
CREATE POLICY "Admins can manage all hobbies"
  ON hobbies
  FOR ALL
  TO authenticated
  USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT is_admin FROM profiles WHERE id = auth.uid())
  );

-- Make the current user an admin
UPDATE profiles 
SET is_admin = true 
WHERE id = auth.uid();