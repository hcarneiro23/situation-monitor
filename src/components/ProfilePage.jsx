import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, User, LogOut, ChevronRight, Check, Rss, Search, X, Camera, Eye, Pencil } from 'lucide-react';

function ProfilePage() {
  const navigate = useNavigate();
  const { user, signOut, updateProfile } = useAuth();
  const { followedSources, setFollowedSources, watchlist, removeFromWatchlist, news } = useStore();
  const [showSourcesPicker, setShowSourcesPicker] = useState(false);
  const [showTrackedPosts, setShowTrackedPosts] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef(null);

  // Get unique sources from news
  const availableSources = useMemo(() => {
    const sources = new Set();
    news.forEach(item => {
      if (item.source) sources.add(item.source);
    });
    return [...sources].sort();
  }, [news]);

  // Filter sources by search
  const filteredSources = useMemo(() => {
    if (!sourceSearch.trim()) return availableSources;
    const search = sourceSearch.toLowerCase();
    return availableSources.filter(s => s.toLowerCase().includes(search));
  }, [availableSources, sourceSearch]);

  // Get tracked posts (news type from watchlist)
  const trackedPosts = useMemo(() => {
    return watchlist?.filter(item => item.type === 'news') || [];
  }, [watchlist]);

  const toggleSource = (source) => {
    const current = followedSources || [];
    if (current.includes(source)) {
      setFollowedSources(current.filter(s => s !== source));
    } else {
      setFollowedSources([...current, source]);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleUpdateDisplayName = async () => {
    if (!newDisplayName.trim() || newDisplayName === user?.displayName) {
      setIsEditingName(false);
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile({ displayName: newDisplayName.trim() });
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update name:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 data URL for simple storage
    // Note: For production, you'd want to upload to Firebase Storage
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl && typeof dataUrl === 'string') {
        setIsUpdating(true);
        try {
          await updateProfile({ photoURL: dataUrl });
        } catch (err) {
          console.error('Failed to update photo:', err);
        } finally {
          setIsUpdating(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveTracked = (id) => {
    removeFromWatchlist(id);
  };

  return (
    <div className="min-h-screen bg-intel-900 pb-16 lg:pb-0">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-intel-900/80 backdrop-blur-md border-b border-intel-700">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-intel-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white">Profile</h1>
        </div>
      </div>

      {/* Content container */}
      <div className="max-w-2xl mx-auto">
        {/* User info with edit options */}
        <div className="px-4 py-6 border-b border-intel-700">
          <div className="flex flex-col items-center gap-4">
            {/* Profile picture with edit button */}
            <div className="relative">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-intel-700 flex items-center justify-center">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUpdating}
                className="absolute bottom-0 right-0 p-2 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            {/* Username with edit */}
            <div className="text-center">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="bg-intel-800 text-white text-lg font-medium text-center px-3 py-1 rounded-lg border border-intel-600 focus:outline-none focus:border-blue-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateDisplayName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                  />
                  <button
                    onClick={handleUpdateDisplayName}
                    disabled={isUpdating}
                    className="p-2 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setNewDisplayName(user?.displayName || '');
                    setIsEditingName(true);
                  }}
                  className="flex items-center gap-2 hover:bg-intel-800 px-3 py-1 rounded-lg transition-colors"
                >
                  <span className="text-white font-medium text-lg">{user?.displayName || 'Set username'}</span>
                  <Pencil className="w-4 h-4 text-gray-500" />
                </button>
              )}
              <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex border-b border-intel-700">
          <div className="flex-1 py-4 text-center border-r border-intel-700">
            <p className="text-white font-bold text-xl">{trackedPosts.length}</p>
            <p className="text-gray-500 text-sm">Tracking</p>
          </div>
          <div className="flex-1 py-4 text-center">
            <p className="text-white font-bold text-xl">{followedSources?.length || 0}</p>
            <p className="text-gray-500 text-sm">Following</p>
          </div>
        </div>

        {/* Settings */}
        <div className="py-2">
          {/* Tracked Posts */}
          <button
            onClick={() => setShowTrackedPosts(!showTrackedPosts)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-intel-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-gray-400" />
              <div className="text-left">
                <p className="text-white">Tracked Posts</p>
                <p className="text-gray-500 text-sm">
                  {trackedPosts.length ? `${trackedPosts.length} posts` : 'No posts tracked'}
                </p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${showTrackedPosts ? 'rotate-90' : ''}`} />
          </button>

          {showTrackedPosts && (
            <div className="px-4 py-3 bg-intel-800/50">
              {trackedPosts.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  No tracked posts yet. Tap the eye icon on any post to track it.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {trackedPosts.map(item => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 bg-intel-700 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => navigate(`/post/${item.id}`)}
                          className="text-white text-sm text-left hover:text-blue-400 transition-colors line-clamp-2"
                        >
                          {item.name}
                        </button>
                        {item.data?.source && (
                          <p className="text-gray-500 text-xs mt-1">{item.data.source}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveTracked(item.id)}
                        className="p-1 hover:bg-intel-600 rounded-full transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Following Sources */}
          <button
            onClick={() => setShowSourcesPicker(!showSourcesPicker)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-intel-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Rss className="w-5 h-5 text-gray-400" />
              <div className="text-left">
                <p className="text-white">Following</p>
                <p className="text-gray-500 text-sm">
                  {followedSources?.length ? `${followedSources.length} sources` : 'No sources followed'}
                </p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${showSourcesPicker ? 'rotate-90' : ''}`} />
          </button>

          {showSourcesPicker && (
            <div className="px-4 py-3 bg-intel-800/50">
              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search sources..."
                  value={sourceSearch}
                  onChange={(e) => setSourceSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-intel-700 border border-intel-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Currently following */}
              {followedSources?.length > 0 && !sourceSearch && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 uppercase mb-2">Currently following</p>
                  <div className="flex flex-wrap gap-2">
                    {followedSources.map(source => (
                      <button
                        key={source}
                        onClick={() => toggleSource(source)}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500 rounded-full text-sm text-blue-300 hover:bg-blue-500/30"
                      >
                        {source}
                        <X className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Available sources */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredSources.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    {sourceSearch ? `No sources matching "${sourceSearch}"` : 'Loading sources...'}
                  </p>
                ) : (
                  filteredSources.map(source => {
                    const selected = followedSources?.includes(source);
                    return (
                      <button
                        key={source}
                        onClick={() => toggleSource(source)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                          selected
                            ? 'bg-blue-500/20 border border-blue-500'
                            : 'bg-intel-700 border border-transparent hover:border-intel-600'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {source.slice(0, 1).toUpperCase()}
                        </div>
                        <span className={`text-sm flex-1 ${selected ? 'text-white' : 'text-gray-300'}`}>{source}</span>
                        {selected && <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-intel-800 transition-colors mt-4 border-t border-intel-700"
          >
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="text-red-400">Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
