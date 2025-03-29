import { supabase } from '../../lib/supabase';
import { ProfileData, UserHobby, UserMedia } from './types';

export async function fetchUserProfile(userId: string): Promise<ProfileData | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchUserHobbies(userId: string): Promise<UserHobby[]> {
  const { data, error } = await supabase
    .from('user_hobbies')
    .select(`
      hobby_id,
      skill_level,
      hobbies (
        name,
        category
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

export async function fetchUserMedia(userId: string): Promise<UserMedia[]> {
  const { data, error } = await supabase
    .from('user_media')
    .select(`
      *,
      hobbies (
        name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function updateUserProfile(userId: string, data: Partial<ProfileData>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId);

  if (error) throw error;
}

export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-avatar.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('user-media')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('user-media')
    .getPublicUrl(filePath);

  return publicUrl;
}

export async function uploadUserMedia(
  userId: string,
  file: File,
  hobbyId: string,
  caption: string
): Promise<void> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('user-media')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('user-media')
    .getPublicUrl(filePath);

  const { error: dbError } = await supabase
    .from('user_media')
    .insert({
      user_id: userId,
      url: publicUrl,
      type: file.type.startsWith('image/') ? 'image' : 'video',
      caption,
      hobby_id: hobbyId
    });

  if (dbError) throw dbError;
}

export async function deleteUserMedia(mediaId: string): Promise<void> {
  const { error } = await supabase
    .from('user_media')
    .delete()
    .eq('id', mediaId);

  if (error) throw error;
}

export async function updateUserHobbies(userId: string, hobbyIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from('user_hobbies')
    .delete()
    .eq('user_id', userId);

  if (deleteError) throw deleteError;

  if (hobbyIds.length > 0) {
    const hobbyData = hobbyIds.map(hobbyId => ({
      user_id: userId,
      hobby_id: hobbyId,
      skill_level: 'beginner'
    }));

    const { error: insertError } = await supabase
      .from('user_hobbies')
      .insert(hobbyData);

    if (insertError) throw insertError;
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}