import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { UserContextType, UserState } from '../types';
import {
  fetchUserProfile,
  fetchUserHobbies,
  fetchUserMedia,
  updateUserProfile,
  uploadUserAvatar,
  uploadUserMedia,
  deleteUserMedia,
  updateUserHobbies
} from '../utils';

const initialState: UserState = {
  profile: null,
  hobbies: [],
  media: [],
  loading: true,
  error: null
};

const UserContext = createContext<UserContextType | undefined>(undefined);

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PROFILE'; payload: UserState['profile'] }
  | { type: 'SET_HOBBIES'; payload: UserState['hobbies'] }
  | { type: 'SET_MEDIA'; payload: UserState['media'] }
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserState['profile']> }
  | { type: 'ADD_MEDIA'; payload: UserState['media'][0] }
  | { type: 'REMOVE_MEDIA'; payload: string };

function reducer(state: UserState, action: Action): UserState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
    case 'SET_HOBBIES':
      return { ...state, hobbies: action.payload };
    case 'SET_MEDIA':
      return { ...state, media: action.payload };
    case 'UPDATE_PROFILE':
      return { ...state, profile: { ...state.profile, ...action.payload } };
    case 'ADD_MEDIA':
      return { ...state, media: [action.payload, ...state.media] };
    case 'REMOVE_MEDIA':
      return {
        ...state,
        media: state.media.filter(item => item.id !== action.payload)
      };
    default:
      return state;
  }
}

export default function UserProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (session?.user?.id) {
      loadUserData(session.user.id);
    }
  }, [session]);

  async function loadUserData(userId: string) {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const [profile, hobbies, media] = await Promise.all([
        fetchUserProfile(userId),
        fetchUserHobbies(userId),
        fetchUserMedia(userId)
      ]);

      dispatch({ type: 'SET_PROFILE', payload: profile });
      dispatch({ type: 'SET_HOBBIES', payload: hobbies });
      dispatch({ type: 'SET_MEDIA', payload: media });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Error loading user data' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }

  const value: UserContextType = {
    ...state,
    updateProfile: async (data) => {
      if (!session?.user?.id || !state.profile) return;
      try {
        await updateUserProfile(session.user.id, data);
        dispatch({ type: 'UPDATE_PROFILE', payload: data });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Error updating profile' });
      }
    },
    uploadAvatar: async (file) => {
      if (!session?.user?.id || !state.profile) return;
      try {
        const publicUrl = await uploadUserAvatar(session.user.id, file);
        await updateUserProfile(session.user.id, { avatar_url: publicUrl });
        dispatch({ type: 'UPDATE_PROFILE', payload: { avatar_url: publicUrl } });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Error uploading avatar' });
      }
    },
    uploadMedia: async (file, hobbyId, caption) => {
      if (!session?.user?.id) return;
      try {
        await uploadUserMedia(session.user.id, file, hobbyId, caption);
        const media = await fetchUserMedia(session.user.id);
        dispatch({ type: 'SET_MEDIA', payload: media });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Error uploading media' });
      }
    },
    deleteMedia: async (mediaId) => {
      try {
        await deleteUserMedia(mediaId);
        dispatch({ type: 'REMOVE_MEDIA', payload: mediaId });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Error deleting media' });
      }
    },
    updateHobbies: async (hobbyIds) => {
      if (!session?.user?.id) return;
      try {
        await updateUserHobbies(session.user.id, hobbyIds);
        const hobbies = await fetchUserHobbies(session.user.id);
        dispatch({ type: 'SET_HOBBIES', payload: hobbies });
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: 'Error updating hobbies' });
      }
    }
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}