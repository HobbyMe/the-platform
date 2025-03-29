import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, MapPin, Phone, Mail, Info, Shield, UserPlus, Trash2,
  Image as ImageIcon, Video, X, Upload, Camera, LogOut, Pencil,
  Check, Save
} from 'lucide-react';
import { getCoordinatesFromAddress } from '../lib/geocoding';

interface ProfileData {
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
}

interface Hobby {
  id: string;
  name: string;
  category: string;
}

interface MediaItem {
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

interface EditableField {
  name: keyof ProfileData;
  label: string;
  type: string;
  icon?: React.ReactNode;
}

const editableFields: EditableField[] = [
  { name: 'username', label: 'Username', type: 'text' },
  { name: 'full_name', label: 'Full Name', type: 'text' },
  { name: 'location', label: 'Location', type: 'text', icon: <MapPin className="h-4 w-4 text-gray-400" /> },
  { name: 'email', label: 'Email', type: 'email', icon: <Mail className="h-4 w-4 text-gray-400" /> },
  { name: 'phone', label: 'Phone', type: 'tel', icon: <Phone className="h-4 w-4 text-gray-400" /> },
  { name: 'bio', label: 'Bio', type: 'textarea', icon: <Info className="h-4 w-4 text-gray-400" /> }
];

export default function Profile() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [allProfiles, setAllProfiles] = useState<ProfileData[]>([]);
  const [profile, setProfile] = useState<ProfileData>({
    username: '',
    full_name: '',
    location: '',
    email: '',
    phone: '',
    bio: '',
    is_admin: false,
    avatar_url: null,
    latitude: null,
    longitude: null
  });
  const [editMode, setEditMode] = useState<{ [key: string]: boolean }>({});
  const [tempValues, setTempValues] = useState<{ [key: string]: string }>({});
  const [availableHobbies, setAvailableHobbies] = useState<Hobby[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedHobbyForUpload, setSelectedHobbyForUpload] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [newProfile, setNewProfile] = useState<ProfileData>({
    username: '',
    full_name: '',
    location: '',
    email: '',
    phone: '',
    bio: '',
    is_admin: false,
    avatar_url: null,
    latitude: null,
    longitude: null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchAllProfiles();
    fetchUserMedia();
  }, [session]);

  const fetchProfile = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setTempValues(data);
      }

      const { data: hobbiesData, error: hobbiesError } = await supabase
        .from('hobbies')
        .select('*')
        .order('name');

      if (hobbiesError) throw hobbiesError;

      if (hobbiesData) {
        setAvailableHobbies(hobbiesData);
      }

      const { data: userHobbies, error: userHobbiesError } = await supabase
        .from('user_hobbies')
        .select('hobby_id')
        .eq('user_id', session.user.id);

      if (userHobbiesError) throw userHobbiesError;

      if (userHobbies) {
        setSelectedHobbies(userHobbies.map((h) => h.hobby_id));
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProfiles = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('username');

      if (error) throw error;

      if (data) {
        setAllProfiles(data);
      }
    } catch (error: any) {
      console.error('Error fetching all profiles:', error.message);
    }
  };

  const fetchUserMedia = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_media')
        .select(`
          *,
          hobbies (
            name
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setMediaItems(data);
      }
    } catch (error) {
      console.error('Error fetching user media:', error);
    }
  };

  const handleFieldEdit = (field: keyof ProfileData) => {
    setEditMode({ ...editMode, [field]: true });
    setTempValues({ ...tempValues, [field]: profile[field] as string });
  };

  const handleFieldSave = async (field: keyof ProfileData) => {
    if (!session?.user?.id) return;

    try {
      let updateData: Partial<ProfileData> = { [field]: tempValues[field] };

      if (field === 'location') {
        const coordinates = await getCoordinatesFromAddress(tempValues.location);
        if (coordinates) {
          updateData = {
            ...updateData,
            latitude: coordinates.lat,
            longitude: coordinates.lng
          };
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', session.user.id);

      if (error) throw error;

      setProfile({ ...profile, ...updateData });
      setEditMode({ ...editMode, [field]: false });
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!session?.user?.id) return;

    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}-avatar.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-media')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-media')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!session?.user?.id || !selectedHobbyForUpload) return;

    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${session.user.id}/${fileName}`;

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
          user_id: session.user.id,
          url: publicUrl,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          caption,
          hobby_id: selectedHobbyForUpload
        });

      if (dbError) throw dbError;

      setCaption('');
      setSelectedHobbyForUpload('');
      fetchUserMedia();
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const deleteMedia = async (mediaId: string) => {
    try {
      const { error } = await supabase
        .from('user_media')
        .delete()
        .eq('id', mediaId);

      if (error) throw error;

      setMediaItems(mediaItems.filter(item => item.id !== mediaId));
    } catch (error) {
      console.error('Error deleting media:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-10 w-10 text-indigo-600" />
                  )}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md hover:bg-gray-50"
                >
                  <Camera className="h-4 w-4 text-gray-600" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{profile.full_name || 'Your Profile'}</h1>
                {profile.is_admin && (
                  <div className="flex items-center gap-2 mt-1">
                    <Shield className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-medium text-indigo-600">Admin</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>

          <div className="space-y-6">
            {editableFields.map((field) => (
              <div key={field.name} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.icon && (
                    <div className="flex items-center gap-2">
                      {field.icon}
                      <span>{field.label}</span>
                    </div>
                  )}
                </label>
                <div className="relative">
                  {editMode[field.name] ? (
                    <div className="flex gap-2">
                      {field.type === 'textarea' ? (
                        <textarea
                          value={tempValues[field.name] || ''}
                          onChange={(e) => setTempValues({ ...tempValues, [field.name]: e.target.value })}
                          className="block w-full rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                          rows={3}
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={tempValues[field.name] || ''}
                          onChange={(e) => setTempValues({ ...tempValues, [field.name]: e.target.value })}
                          className="block w-full rounded-lg border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      )}
                      <button
                        onClick={() => handleFieldSave(field.name)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setEditMode({ ...editMode, [field.name]: false })}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <div className="flex-1">
                        {field.type === 'textarea' ? (
                          <p className="text-gray-900">{profile[field.name] || '-'}</p>
                        ) : (
                          <p className="text-gray-900">{profile[field.name] || '-'}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleFieldEdit(field.name)}
                        className="p-2 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Hobbies</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {availableHobbies.map((hobby) => (
                <div key={hobby.id} className="relative flex items-start">
                  <div className="flex h-6 items-center">
                    <input
                      type="checkbox"
                      id={hobby.id}
                      checked={selectedHobbies.includes(hobby.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedHobbies([...selectedHobbies, hobby.id]);
                        } else {
                          setSelectedHobbies(selectedHobbies.filter((id) => id !== hobby.id));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                  </div>
                  <div className="ml-3 text-sm leading-6">
                    <label htmlFor={hobby.id} className="text-gray-700">
                      {hobby.name}
                      <span className="text-gray-500 text-xs block">
                        {hobby.category}
                      </span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Media Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Your Media Content</h2>
          
          <div className="mb-8">
            <div className="flex items-end gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Hobby
                </label>
                <select
                  value={selectedHobbyForUpload}
                  onChange={(e) => setSelectedHobbyForUpload(e.target.value)}
                  className="block w-full rounded-lg border-gray-200"
                >
                  <option value="">Choose a hobby</option>
                  {availableHobbies.map((hobby) => (
                    <option key={hobby.id} value={hobby.id}>
                      {hobby.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Caption
                </label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="block w-full rounded-lg border-gray-200"
                  placeholder="Add a caption..."
                />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,video/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!selectedHobbyForUpload || uploading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Upload className="h-5 w-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5" />
                    Upload Media
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mediaItems.map((item) => (
              <div key={item.id} className="relative group">
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={item.caption}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                ) : (
                  <video
                    src={item.url}
                    controls
                    className="w-full h-64 object-cover rounded-lg"
                  />
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => deleteMedia(item.id)}
                      className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm text-gray-600">{item.caption}</p>
                  <p className="text-xs text-gray-500">
                    {item.hobbies.name} • {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {mediaItems.length === 0 && (
            <div className="text-center py-12">
              <Camera className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No media</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start by uploading your first photo or video
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}