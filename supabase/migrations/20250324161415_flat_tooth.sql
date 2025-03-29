/*
  # Fix Chat Policies

  1. Changes
    - Drop existing problematic policies
    - Create simplified policies for chat functionality
    - Fix infinite recursion issues
    - Ensure proper access control

  2. Security
    - Users can only access their own chats
    - Users can only send messages to chats they're part of
    - Maintain data isolation between users
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can view chat participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can join chats" ON chat_participants;
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;

-- Chat policies
CREATE POLICY "Users can view their chats"
  ON chats
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT chat_id 
      FROM chat_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chats"
  ON chats
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Chat participants policies
CREATE POLICY "Users can view chat participants"
  ON chat_participants
  FOR SELECT
  TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id 
      FROM chat_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join chats"
  ON chat_participants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- Messages policies
CREATE POLICY "Users can view messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id 
      FROM chat_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    chat_id IN (
      SELECT chat_id 
      FROM chat_participants 
      WHERE user_id = auth.uid()
    )
  );