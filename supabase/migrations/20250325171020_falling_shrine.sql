/*
  # Update all user locations to Liverpool

  1. Changes
    - Set all users' location to Liverpool
    - Update latitude and longitude coordinates for Liverpool
    - Ensure coordinates are accurate for distance calculations

  2. Security
    - Maintains existing RLS policies
    - No security changes needed
*/

-- Update all profiles to Liverpool with corresponding coordinates
UPDATE profiles
SET 
  location = 'Liverpool, UK',
  latitude = 53.4084,  -- Liverpool's latitude
  longitude = -2.9916  -- Liverpool's longitude
WHERE true;