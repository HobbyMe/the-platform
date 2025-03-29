import { User } from '@supabase/supabase-js';

export interface ProfileData {
  id: string;
  username: string;
  full_name: string;
  location: string;
  email: string;
  phone: string;
  bio: string;
  is_admin: boolean;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserHobby {
  hobby_id: string;
  skill_level: string;
  hobbies: {
    name: string;
    category: string;
  };
}

export interface UserMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption: string;
  created_at: string;
  hobby_id: string;
  hobbies: {
    name: string;
  };
}

export interface UserState {
  profile: ProfileData | null;
  hobbies: UserHobby[];
  media: UserMedia[];
  loading: boolean;
  error: string | null;
}

export interface UserContextType extends UserState {
  updateProfile: (data: Partial<ProfileData>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  uploadMedia: (file: File, hobbyId: string, caption: string) => Promise<void>;
  deleteMedia: (mediaId: string) => Promise<void>;
  updateHobbies: (hobbyIds: string[]) => Promise<void>;
}