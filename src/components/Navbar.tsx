import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { session } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center group">
              <div className="relative flex items-center">
                {/* Logo Container */}
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 rotate-45 transform transition-transform group-hover:rotate-90 duration-300">
                  <div className="w-full h-full bg-gray-900 rounded-[7px] flex items-center justify-center">
                    <div className="-rotate-45 transform text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-bold text-xl">
                      H
                    </div>
                  </div>
                </div>
                {/* Text */}
                <span className="ml-3 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                  HobbyMe
                </span>
                {/* Decorative dot */}
                <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
              </div>
            </Link>
          </div>
          
          {session && (
            <div className="flex items-center">
              <Link
                to="/profile"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-all duration-300"
              >
                <UserCircle className="h-5 w-5" />
                Profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}