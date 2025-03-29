import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MapPin, Search, Filter, Users2, Gamepad2, Tent, MessageCircle, Star } from 'lucide-react';
import Chat from './Chat';
import { calculateDistance } from '../lib/geocoding';
import { useAuth } from '../contexts/AuthContext';

interface Profile {
  id: string;
  username: string;
  full_name: string;
  location: string;
  bio: string;
  avatar_url: string;
  latitude?: number;
  longitude?: number;
  similarity_score?: number;
  distance?: number;
  shared_hobbies?: Array<{
    name: string;
    category: string;
  }>;
  user_hobbies?: Array<{
    hobbies: {
      name: string;
      category: string;
    };
  }>;
}

interface GroupedProfiles {
  indoor: {
    [hobby: string]: Profile[];
  };
  outdoor: {
    [location: string]: Profile[];
  };
}

export default function Dashboard() {
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedCategory = searchParams.get('category') || 'indoor';
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [suggestedProfiles, setSuggestedProfiles] = useState<Profile[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userCoordinates, setUserCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (session?.user?.id) {
      fetchUserCoordinates();
      fetchSuggestions();
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.id) {
      fetchProfiles();
    }
  }, [selectedCategory, session]);

  const fetchUserCoordinates = async () => {
    if (!session?.user?.id) return;

    try {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('latitude, longitude')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      if (userProfile?.latitude && userProfile?.longitude) {
        setUserCoordinates({
          latitude: userProfile.latitude,
          longitude: userProfile.longitude
        });
      }
    } catch (error) {
      console.error('Error fetching user coordinates:', error);
    }
  };

  const fetchSuggestions = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .rpc('get_user_suggestions', {
          p_user_id: session.user.id,
          p_category: selectedCategory,
          p_max_distance: 50
        });

      if (error) throw error;

      if (data) {
        setSuggestedProfiles(data);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const fetchProfiles = async () => {
    if (!session?.user?.id) return;

    try {
      const { data: profilesData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          full_name,
          location,
          bio,
          avatar_url,
          latitude,
          longitude,
          user_hobbies (
            hobbies (
              name,
              category
            )
          )
        `);

      if (error) throw error;

      if (profilesData) {
        const filteredProfiles = profilesData.filter(profile =>
          profile.user_hobbies.some(uh => 
            uh.hobbies.category.toLowerCase() === selectedCategory.toLowerCase()
          )
        );
        
        setProfiles(filteredProfiles);
        const uniqueLocations = [...new Set(filteredProfiles.map((p) => p.location))].filter(Boolean);
        setLocations(uniqueLocations);
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const isWithinRadius = (profile: Profile): boolean => {
    if (!userCoordinates || !profile.latitude || !profile.longitude) return false;
    
    const distance = calculateDistance(
      userCoordinates.latitude,
      userCoordinates.longitude,
      profile.latitude,
      profile.longitude
    );
    
    return distance <= 50; // 50 miles radius
  };

  const groupProfiles = (profiles: Profile[]): GroupedProfiles => {
    const grouped: GroupedProfiles = {
      indoor: {},
      outdoor: {},
    };

    profiles.forEach((profile) => {
      if (
        searchTerm &&
        !profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !profile.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !profile.user_hobbies?.some((uh) =>
          uh.hobbies.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      ) {
        return;
      }

      if (selectedLocation && profile.location !== selectedLocation) {
        return;
      }

      // For outdoor activities, check if within radius
      if (selectedCategory === 'outdoor' && !isWithinRadius(profile)) {
        return;
      }

      profile.user_hobbies?.forEach((uh) => {
        if (uh.hobbies.category.toLowerCase() === selectedCategory.toLowerCase()) {
          if (selectedCategory === 'indoor') {
            if (!grouped.indoor[uh.hobbies.name]) {
              grouped.indoor[uh.hobbies.name] = [];
            }
            if (!grouped.indoor[uh.hobbies.name].find((p) => p.id === profile.id)) {
              grouped.indoor[uh.hobbies.name].push(profile);
            }
          } else {
            if (!grouped.outdoor[profile.location]) {
              grouped.outdoor[profile.location] = [];
            }
            if (!grouped.outdoor[profile.location].find((p) => p.id === profile.id)) {
              grouped.outdoor[profile.location].push(profile);
            }
          }
        }
      });
    });

    return grouped;
  };

  const renderProfileCard = (profile: Profile, category: string) => (
    <div key={profile.id} className="trendy-card hover-lift hover-glow animate-slide-up">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 p-0.5">
                <div className="w-full h-full rounded-full overflow-hidden">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <span className="text-xl font-medium text-indigo-400">
                        {profile.full_name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-100 truncate">
                {profile.full_name}
              </h3>
              <p className="text-sm text-gray-400">@{profile.username}</p>
            </div>
          </div>
          <button
            onClick={() => setSelectedUserId(profile.id)}
            className="trendy-button text-white flex items-center gap-2 px-4 py-2 rounded-full text-sm hover:shadow-lg transition-all duration-300"
          >
            <MessageCircle className="h-4 w-4" />
            Chat
          </button>
        </div>
        
        {profile.location && (
          <div className="flex items-center mt-4 text-gray-400 hover:text-indigo-400 transition-colors duration-300">
            <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
            <span className="text-sm truncate">{profile.location}</span>
          </div>
        )}
        
        {profile.bio && (
          <p className="mt-4 text-sm text-gray-300 line-clamp-3 hover:line-clamp-none transition-all duration-300">
            {profile.bio}
          </p>
        )}

        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-200 mb-2">Hobbies</h4>
          <div className="flex flex-wrap gap-2">
            {profile.user_hobbies
              ?.filter(uh => uh.hobbies.category.toLowerCase() === category.toLowerCase())
              .map((uh, index) => (
                <span
                  key={index}
                  className="trendy-badge text-white hover:scale-105 transition-transform duration-300"
                >
                  {uh.hobbies.name}
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuggestions = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold gradient-text flex items-center gap-2">
        <Star className="h-5 w-5" />
        Suggested Matches
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suggestedProfiles.map(profile => renderProfileCard(profile, selectedCategory))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse-ring"></div>
          <p className="text-gray-400 animate-pulse">Loading profiles...</p>
        </div>
      </div>
    );
  }

  const groupedProfiles = groupProfiles(profiles);

  return (
    <>
      <div className="space-y-6">
        <div className="glass-morphism rounded-xl shadow-lg">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              {selectedCategory === 'indoor' ? (
                <Gamepad2 className="h-6 w-6 text-indigo-400 animate-float" />
              ) : (
                <Tent className="h-6 w-6 text-indigo-400 animate-float" />
              )}
              <h1 className="text-2xl font-bold gradient-text">
                {selectedCategory === 'indoor' ? 'Indoor Activities' : 'Outdoor Activities'}
              </h1>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by name or hobby..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full rounded-lg bg-gray-800 border-gray-700 text-gray-100 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-300"
                  />
                </div>
              </div>
              {selectedCategory === 'outdoor' && (
                <div className="flex-1">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      className="pl-10 w-full rounded-lg bg-gray-800 border-gray-700 text-gray-100 focus:border-indigo-500 focus:ring-indigo-500 transition-all duration-300"
                    >
                      <option value="">All Locations</option>
                      {locations.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {suggestedProfiles.length > 0 && renderSuggestions()}

        <div className="space-y-8">
          {selectedCategory === 'indoor' ? (
            Object.entries(groupedProfiles.indoor).map(([hobby, profiles]) => (
              <div key={hobby} className="space-y-4">
                <h2 className="text-xl font-semibold gradient-text flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  {hobby}
                  <span className="text-sm font-normal text-gray-400">
                    ({profiles.length} {profiles.length === 1 ? 'person' : 'people'})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profiles.map(profile => renderProfileCard(profile, selectedCategory))}
                </div>
              </div>
            ))
          ) : (
            Object.entries(groupedProfiles.outdoor).map(([location, profiles]) => (
              <div key={location} className="space-y-4">
                <h2 className="text-xl font-semibold gradient-text flex items-center gap-2">
                  <Tent className="h-5 w-5" />
                  {location}
                  <span className="text-sm font-normal text-gray-400">
                    ({profiles.length} {profiles.length === 1 ? 'person' : 'people'})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profiles.map(profile => renderProfileCard(profile, selectedCategory))}
                </div>
              </div>
            ))
          )}

          {((selectedCategory === 'indoor' && Object.keys(groupedProfiles.indoor).length === 0) ||
            (selectedCategory === 'outdoor' && Object.keys(groupedProfiles.outdoor).length === 0)) && (
            <div className="text-center py-12">
              <Users2 className="mx-auto h-12 w-12 text-gray-600 animate-float" />
              <h3 className="mt-4 text-lg font-medium gradient-text">No profiles found</h3>
              <p className="mt-2 text-gray-400">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </div>
      </div>
      {selectedUserId && (
        <Chat
          recipientId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </>
  );
}