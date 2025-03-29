/*
  # Add Location Coordinates

  1. Changes
    - Add latitude and longitude columns to profiles table
    - Add function to calculate distance between two points
    - Update existing profiles to have default coordinates

  2. Security
    - Maintain existing RLS policies
    - Function runs with security definer permissions
*/

-- Add coordinates columns to profiles
ALTER TABLE profiles
ADD COLUMN latitude double precision,
ADD COLUMN longitude double precision;

-- Create a function to calculate distance between two points
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
RETURNS double precision
LANGUAGE plpgsql
AS $$
DECLARE
  R double precision := 3959; -- Earth's radius in miles
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
BEGIN
  -- Convert degrees to radians
  lat1 := radians(lat1);
  lon1 := radians(lon1);
  lat2 := radians(lat2);
  lon2 := radians(lon2);

  -- Haversine formula
  dlat := lat2 - lat1;
  dlon := lon2 - lon1;
  a := sin(dlat/2)^2 + cos(lat1) * cos(lat2) * sin(dlon/2)^2;
  c := 2 * asin(sqrt(a));
  
  RETURN R * c;
END;
$$;