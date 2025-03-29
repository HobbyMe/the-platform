/*
  # Add auth trigger for profile creation
  
  1. Changes
    - Add a trigger to automatically create a profile when a user signs up
    - Ensure required fields are populated with default values
  
  2. Security
    - Maintains existing RLS policies
    - Trigger runs with security definer permissions
*/

-- Create a trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    location,
    email,
    created_at
  ) VALUES (
    NEW.id,
    CONCAT('user_', SUBSTRING(NEW.id::text, 1, 8)),
    '',
    '',
    NEW.email,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();