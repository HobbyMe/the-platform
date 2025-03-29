import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Mountain } from 'lucide-react';

export default function HobbySelection() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSelection = (category: string) => {
    setLoading(true);
    setTimeout(() => {
      navigate(`/dashboard?category=${category}`);
      setLoading(false);
    }, 500);
  };

  return (
    <div
      className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      role="main"
      aria-labelledby="hobby-heading"
    >
      <div className="max-w-3xl w-full">
        <h2
          id="hobby-heading"
          className="text-center text-3xl font-extrabold text-gray-900 mb-12"
        >
          {loading ? 'Loading...' : 'What type of hobbies interest you?'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Indoor Button */}
          <button
            onClick={() => handleSelection('indoor')}
            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border-2 border-transparent hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            aria-label="Select Indoor Activities"
            disabled={loading}
          >
            <div className="flex flex-col items-center text-center">
              <Home className="h-16 w-16 text-indigo-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Indoor Activities
              </h3>
              <p className="text-gray-500">
                Discover people who enjoy indoor hobbies like reading, cooking,
                gaming, and more.
              </p>
            </div>
          </button>

          {/* Outdoor Button */}
          <button
            onClick={() => handleSelection('outdoor')}
            className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 border-2 border-transparent hover:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            aria-label="Select Outdoor Activities"
            disabled={loading}
          >
            <div className="flex flex-col items-center text-center">
              <Mountain className="h-16 w-16 text-indigo-600 mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Outdoor Activities
              </h3>
              <p className="text-gray-500">
                Connect with people who love outdoor adventures like hiking,
                gardening, and sports.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
