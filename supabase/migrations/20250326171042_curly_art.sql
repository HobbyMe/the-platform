/*
  # Add Hobby Suggestions System
  
  1. New Functions
    - `get_hobby_similarity_score`: Calculate similarity between users based on shared hobbies
    - `get_user_suggestions`: Get suggested users based on hobby similarity and location
  
  2. Security
    - Functions run with security definer to access user data
    - Maintain existing RLS policies
*/

-- Function to calculate hobby similarity score between two users
CREATE OR REPLACE FUNCTION get_hobby_similarity_score(user1_id uuid, user2_id uuid)
RETURNS float
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  shared_hobbies int;
  total_hobbies int;
  similarity float;
BEGIN
  -- Count shared hobbies
  SELECT COUNT(DISTINCT h1.hobby_id) INTO shared_hobbies
  FROM user_hobbies h1
  JOIN user_hobbies h2 ON h1.hobby_id = h2.hobby_id
  WHERE h1.user_id = user1_id AND h2.user_id = user2_id;

  -- Count total unique hobbies between both users
  SELECT COUNT(DISTINCT hobby_id) INTO total_hobbies
  FROM (
    SELECT hobby_id FROM user_hobbies WHERE user_id = user1_id
    UNION
    SELECT hobby_id FROM user_hobbies WHERE user_id = user2_id
  ) all_hobbies;

  -- Calculate Jaccard similarity coefficient
  IF total_hobbies = 0 THEN
    RETURN 0;
  END IF;
  
  similarity := shared_hobbies::float / total_hobbies::float;
  RETURN similarity;
END;
$$;

-- Function to get user suggestions based on hobbies and location
CREATE OR REPLACE FUNCTION get_user_suggestions(
  user_id uuid,
  category text DEFAULT NULL,
  max_distance float DEFAULT 50 -- miles
)
RETURNS TABLE (
  id uuid,
  username text,
  full_name text,
  location text,
  bio text,
  avatar_url text,
  latitude double precision,
  longitude double precision,
  similarity_score float,
  distance float,
  shared_hobbies jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_location AS (
    SELECT latitude AS user_lat, longitude AS user_lng
    FROM profiles
    WHERE id = user_id
  ),
  potential_matches AS (
    SELECT DISTINCT
      p.id,
      p.username,
      p.full_name,
      p.location,
      p.bio,
      p.avatar_url,
      p.latitude,
      p.longitude,
      get_hobby_similarity_score(user_id, p.id) as similarity_score,
      calculate_distance(
        (SELECT user_lat FROM user_location),
        (SELECT user_lng FROM user_location),
        p.latitude,
        p.longitude
      ) as distance,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', h.name,
            'category', h.category
          )
        )
        FROM user_hobbies uh
        JOIN hobbies h ON h.id = uh.hobby_id
        WHERE uh.user_id = p.id
        AND (category IS NULL OR h.category = category)
      ) as shared_hobbies
    FROM profiles p
    WHERE p.id != user_id
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
  )
  SELECT *
  FROM potential_matches
  WHERE 
    similarity_score > 0
    AND distance <= max_distance
    AND shared_hobbies IS NOT NULL
  ORDER BY 
    similarity_score DESC,
    distance ASC
  LIMIT 50;
END;
$$;