/*
  # Fix user suggestions function table alias

  1. Changes
    - Fix table alias reference in JOIN clause
    - Add better column references
    - Improve error handling
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_user_suggestions(UUID, TEXT, FLOAT);

-- Recreate the function with exact parameter names matching frontend
CREATE OR REPLACE FUNCTION get_user_suggestions(
  p_user_id UUID,
  p_category TEXT,
  p_max_distance FLOAT
) RETURNS TABLE (
  id UUID,
  username TEXT,
  full_name TEXT,
  location TEXT,
  bio TEXT,
  avatar_url TEXT,
  latitude FLOAT,
  longitude FLOAT,
  similarity_score FLOAT,
  distance FLOAT,
  shared_hobbies JSON
) AS $$
BEGIN
  -- Validate input parameters
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;

  IF p_category IS NULL THEN
    RAISE EXCEPTION 'category cannot be null';
  END IF;

  IF p_max_distance IS NULL OR p_max_distance <= 0 THEN
    RAISE EXCEPTION 'max_distance must be greater than 0';
  END IF;

  RETURN QUERY
  WITH user_location AS (
    SELECT 
      p.latitude AS user_lat,
      p.longitude AS user_lng
    FROM profiles p
    WHERE p.id = p_user_id
  ),
  user_hobbies AS (
    SELECT array_agg(h.id) AS hobby_ids
    FROM user_hobbies uh
    JOIN hobbies h ON h.id = uh.hobby_id
    WHERE uh.user_id = p_user_id 
    AND h.category = p_category
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
      array_agg(h.id) AS match_hobby_ids,
      array_agg(json_build_object(
        'name', h.name,
        'category', h.category
      )) AS hobby_details
    FROM profiles p
    JOIN user_hobbies uh ON uh.user_id = p.id
    JOIN hobbies h ON h.id = uh.hobby_id
    WHERE p.id != p_user_id
      AND h.category = p_category
    GROUP BY p.id, p.username, p.full_name, p.location, p.bio, p.avatar_url, p.latitude, p.longitude
  )
  SELECT
    m.id,
    m.username,
    m.full_name,
    m.location,
    m.bio,
    m.avatar_url,
    m.latitude,
    m.longitude,
    COALESCE(
      CAST(array_length(array(SELECT UNNEST(match_hobby_ids) INTERSECT SELECT UNNEST(uh.hobby_ids)), 1) AS FLOAT) / 
      GREATEST(array_length(match_hobby_ids, 1), array_length(uh.hobby_ids, 1)),
      0
    ) AS similarity_score,
    COALESCE(
      (
        6371 * acos(
          cos(radians(ul.user_lat)) * 
          cos(radians(m.latitude)) * 
          cos(radians(m.longitude) - radians(ul.user_lng)) + 
          sin(radians(ul.user_lat)) * 
          sin(radians(m.latitude))
        ) * 0.621371
      ),
      0
    ) AS distance,
    CAST(array_to_json(m.hobby_details) AS json) AS shared_hobbies
  FROM potential_matches m
  CROSS JOIN user_hobbies uh
  CROSS JOIN user_location ul
  WHERE COALESCE(
    (
      6371 * acos(
        cos(radians(ul.user_lat)) * 
        cos(radians(m.latitude)) * 
        cos(radians(m.longitude) - radians(ul.user_lng)) + 
        sin(radians(ul.user_lat)) * 
        sin(radians(m.latitude))
      ) * 0.621371
    ),
    0
  ) <= p_max_distance
  ORDER BY similarity_score DESC, distance ASC;
END;
$$ LANGUAGE plpgsql;