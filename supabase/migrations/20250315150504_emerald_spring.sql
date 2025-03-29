/*
  # Initial Schema Setup for HobbyMe

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, linked to auth.users)
      - `username` (text, unique)
      - `full_name` (text)
      - `location` (text)
      - `email` (text)
      - `phone` (text)
      - `bio` (text)
      - `avatar_url` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `hobbies`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `category` (text)
      - `created_at` (timestamp)
    
    - `user_hobbies`
      - `user_id` (uuid, references profiles)
      - `hobby_id` (uuid, references hobbies)
      - `skill_level` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  location text NOT NULL,
  email text NOT NULL,
  phone text,
  bio text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create hobbies table
CREATE TABLE hobbies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create user_hobbies junction table
CREATE TABLE user_hobbies (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  hobby_id uuid REFERENCES hobbies(id) ON DELETE CASCADE,
  skill_level text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, hobby_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_hobbies ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" 
  ON profiles FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

-- Hobbies policies
CREATE POLICY "Anyone can view hobbies" 
  ON hobbies FOR SELECT 
  TO authenticated 
  USING (true);

-- User hobbies policies
CREATE POLICY "Users can view all user hobbies" 
  ON user_hobbies FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Users can manage own hobbies" 
  ON user_hobbies FOR ALL 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Insert some default hobbies
INSERT INTO hobbies (name, category) VALUES
  ('Reading', 'Indoor'),
  ('Photography', 'Arts'),
  ('Hiking', 'Outdoor'),
  ('Cooking', 'Indoor'),
  ('Gaming', 'Indoor'),
  ('Painting', 'Arts'),
  ('Swimming', 'Sports'),
  ('Gardening', 'Outdoor'),
  ('Music', 'Arts'),
  ('Yoga', 'Fitness');