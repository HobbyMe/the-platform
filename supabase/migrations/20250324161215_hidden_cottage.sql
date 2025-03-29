/*
  # Add User Media Content Support

  1. New Tables
    - `user_media`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `url` (text)
      - `type` (text: image, video)
      - `caption` (text)
      - `created_at` (timestamp)
      - `hobby_id` (uuid, references hobbies)

  2. Security
    - Enable RLS
    - Add policies for media management
    - Only users with matching hobbies can view content
*/

-- Create user_media table
CREATE TABLE user_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  url text NOT NULL,
  type text NOT NULL CHECK (type IN ('image', 'video')),
  caption text,
  created_at timestamptz DEFAULT now(),
  hobby_id uuid REFERENCES hobbies(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE user_media ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own media"
  ON user_media
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view media of people with shared hobbies"
  ON user_media
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_hobbies uh1
      WHERE uh1.user_id = auth.uid()
      AND uh1.hobby_id = user_media.hobby_id
      AND EXISTS (
        SELECT 1 FROM user_hobbies uh2
        WHERE uh2.user_id = user_media.user_id
        AND uh2.hobby_id = user_media.hobby_id
      )
    )
  );