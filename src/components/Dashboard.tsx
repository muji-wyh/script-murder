'use client';

import { useState, useEffect } from 'react';
import { User, Room } from '@/types';
import FriendsList from './FriendsList';
import ChatModal from './ChatModal';
import RoomsList from './RoomsList';
import CreateRoomModal from './CreateRoomModal';
import ImportScriptModal from './ImportScriptModal';
import ScriptStore from './ScriptStore';
import ScriptRemixModal from './ScriptRemixModal';
import RatingStars from './RatingStars';
import RateScriptModal from './RateScriptModal';
import TestImportModal from './TestImportModal';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showImportScript, setShowImportScript] = useState(false);
  const [showTestImport, setShowTestImport] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [friends, setFriends] = useState([]);
  const [styleGrants, setStyleGrants] = useState<string[]>([]);
  const [selectedCollectedScript, setSelectedCollectedScript] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<User>(user);
  const [chatFriend, setChatFriend] = useState<any>(null);
  const [showStore, setShowStore] = useState(false);
  const [remixScriptId, setRemixScriptId] = useState<string | null>(null);
  const [remixCollectedId, setRemixCollectedId] = useState<string | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState<string | null>(null);

  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateTarget, setRateTarget] = useState<any>(null);
  const openRate = (script:any) => { setRateTarget(script); setRateModalOpen(true); };
  const handleRated = () => { setRateModalOpen(false); setRateTarget(null); };

  useEffect(() => {
    // Ensure immediate retrieval of latest user data
    fetchUserData();
    fetchRooms();
  fetchFriends();
  fetchStyleGrants();
    
    // Add custom event listener to refresh user data
    const handleUserDataUpdate = () => {
      fetchUserData();
    };
    
    window.addEventListener('userDataUpdated', handleUserDataUpdate);
    
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate);
    };
  }, [user.id]); // Add user.id as dependency

  // Get latest user data
  const fetchUserData = async () => {
    try {
      console.log('Fetching user data for ID:', user.id);
      const response = await fetch(`/api/users/${user.id}/profile`);
      if (response.ok) {
        const data = await response.json();
        console.log('User data response:', data);
        if (data.success) {
          console.log('Setting current user with collected scripts:', data.user.collectedScripts);
          setCurrentUser(data.user);
          // Update user data in sessionStorage
          sessionStorage.setItem('currentUser', JSON.stringify(data.user));
        }
      } else {
        console.error('Failed to fetch user data:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      if (data.success) {
        setRooms(data.rooms);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  // Poll to refresh room list, allowing lobby to automatically show new rooms (no manual refresh needed)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/rooms');
        const data = await response.json();
        if (data.success) {
          setRooms(data.rooms);
        }
      } catch (error) {
        // Silent failure to avoid disturbing user
      }
    }, 2000); // Fetch every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchFriends = async () => {
    try {
      const response = await fetch(`/api/users/${currentUser.id}/friends`);
      const data = await response.json();
      if (data.success) {
        setFriends(data.friends);
      }
    } catch (error) {
      console.error('Failed to fetch friends:', error);
    }
  };

  const fetchStyleGrants = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}/style-grants`);
      const data = await res.json();
      if (data.success) setStyleGrants(data.grants || []);
    } catch (e) {
      console.error('Failed to fetch style grants', e);
    }
  };

  const toggleGrant = async (friendId: string, isGranted: boolean) => {
    try {
      if (isGranted) {
        // revoke
        const res = await fetch(`/api/users/${user.id}/style-grants?friendId=${friendId}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) setStyleGrants(data.grants || []);
      } else {
        const res = await fetch(`/api/users/${user.id}/style-grants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ friendId })
        });
        const data = await res.json();
        if (data.success) setStyleGrants(data.grants || []);
      }
    } catch (e) {
      console.error('Toggle style grant failed', e);
    }
  };

  const handleCreateRoom = async (roomData: any) => {
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...roomData,
          hostId: currentUser.id
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Update room list, add new room to the front
        setRooms([data.room, ...rooms]);
        setShowCreateRoom(false);
        
        // Automatically enter newly created room
        window.location.href = `/room/${data.room.id}`;
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  // Create game from collected script
  const createGameFromCollectedScript = (collectedScript: any) => {
    setSelectedCollectedScript(collectedScript);
    setShowCreateRoom(true);
  };

  // Handle successful script import
  const handleImportSuccess = () => {
    // Refresh user data to get latest collected scripts
    fetchUserData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-game-bg via-slate-800 to-slate-900">
      {/* Header navigation */}
      <header className="bg-game-card border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-game-accent to-yellow-400 bg-clip-text text-transparent">
                LLM Reasoning Master
              </h1>
              <span className="text-gray-400">|</span>
              <span className="text-white">Welcome, {currentUser.username}</span>
            </div>
            
            <button
              onClick={onLogout}
              className="btn-secondary px-4 py-2"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left sidebar */}
          <div className="col-span-4 space-y-6">
            {/* Friends list */}
            <div className="h-80">
              <div className="card h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <span className="mr-2">👥</span>
                    Friends List
                  </h2>
                  <span className="text-sm text-gray-400">
                    {friends.filter((f: any) => f.isOnline).length}/{friends.length} Online
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <FriendsList friends={friends} currentUserId={currentUser.id} styleGrants={styleGrants} onToggleGrant={toggleGrant} onChat={(f:any)=> setChatFriend(f)} />
                </div>
              </div>
            </div>

            {/* Collected scripts */}
            <div className="h-80">
              <div className="card h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <span className="mr-2">📚</span>
                    Collected Scripts
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowImportScript(true)}
                      className="text-sm bg-game-accent hover:bg-opacity-80 text-white px-3 py-1 rounded transition-colors"
                      title="Import external PDF scripts"
                    >
                      📥 PDF Import
                    </button>
                    <button
                      onClick={() => setShowTestImport(true)}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                      title="Text import test"
                    >
                      🧪 Test Import
                    </button>
                    <span className="text-sm text-gray-400">
                      {currentUser?.collectedScripts?.length || 0} scripts
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {(!currentUser?.collectedScripts || currentUser.collectedScripts.length === 0) ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">📖</div>
                      <p className="text-gray-400 text-sm">No collected scripts</p>
                      <p className="text-gray-500 text-xs mt-1">Collect favorite scripts after completing games</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {([...currentUser.collectedScripts]
                        .sort((a:any,b:any)=> (b.collectedAt||0) - (a.collectedAt||0)))
                        .map((script) => (
                        <div 
                          key={script.id} 
                          className="bg-gray-800 rounded-lg p-3 hover:bg-gray-700 transition-colors cursor-pointer"
                          onClick={() => createGameFromCollectedScript(script)}
                        >
                          <h4 className="text-white text-sm font-medium">{script.title}</h4>
                          <p className="text-gray-400 text-xs mt-1">
                            {script.rounds} rounds · {script.collectedAt ? new Date(script.collectedAt).toLocaleDateString() : 'Collection time unknown'}
                          </p>
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                            {script.background}
                          </p>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setRemixScriptId(script.originalScriptId || script.id); setRemixCollectedId(script.id); }}
                              className="text-xs px-2 py-1 bg-purple-600/40 hover:bg-purple-600/60 text-purple-200 rounded"
                            >Remix</button>
                            <button
                              type="button"
                              onClick={(e)=> { e.stopPropagation(); openRate(script); }}
                              className="text-xs px-2 py-1 bg-yellow-600/40 hover:bg-yellow-600/60 text-yellow-200 rounded"
                            >Rate</button>
                            {!script.derivativeOfScriptId && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const priceStr = prompt('Please enter listing price (>=0 integer):','10');
                                  if (priceStr === null) return;
                                  const p = parseInt(priceStr,10);
                                  if (Number.isNaN(p) || p < 0) { alert('Invalid price'); return; }
                                  try {
                                    const res = await fetch('/api/scripts/collected/publish', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id, collectedScriptId: script.id, price: p }) });
                                    const data = await res.json();
                                    if (data.success) { 
                                      alert('Successfully listed'); 
                                      // Trigger data refresh event
                                      window.dispatchEvent(new Event('userDataUpdated'));
                                    }
                                    else alert(data.error || 'Listing failed');
                                  } catch { alert('Network error'); }
                                }}
                                className="text-xs px-2 py-1 bg-green-600/40 hover:bg-green-600/60 text-green-200 rounded"
                              >List</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar - Rooms area */}
          <div className="col-span-8">
            <div className="card h-[calc(100vh-200px)] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white flex items-center">
                  <span className="mr-3">🎮</span>
                  Game Rooms
                </h2>
                <button
                  onClick={() => setShowCreateRoom(true)}
                  className="btn-primary px-6 py-3 text-lg flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Create Room</span>
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <RoomsList rooms={rooms} currentUser={user} />
              </div>
            </div>
            <div className="mt-6 h-80">
              <ScriptStore currentUser={currentUser} />
            </div>
          </div>
        </div>
      </div>

      {/* Create room modal */}
      {showCreateRoom && (
        <CreateRoomModal
          onClose={() => {
            setShowCreateRoom(false);
            setSelectedCollectedScript(null);
          }}
          onSubmit={handleCreateRoom}
          collectedScript={selectedCollectedScript}
        />
      )}

      {/* Import script modal */}
      {showImportScript && (
        <ImportScriptModal
          isOpen={showImportScript}
          onClose={() => setShowImportScript(false)}
          onSuccess={handleImportSuccess}
          currentUserId={currentUser?.id}
        />
      )}

      {/* Test import modal */}
      {showTestImport && (
        <TestImportModal
          isOpen={showTestImport}
          onClose={() => setShowTestImport(false)}
          onSuccess={handleImportSuccess}
        />
      )}
      {chatFriend && (
        <ChatModal
          user={currentUser}
          friend={chatFriend}
          onClose={()=> setChatFriend(null)}
          collectedScripts={currentUser?.collectedScripts || []}
        />
      )}
    {remixScriptId && (
        <ScriptRemixModal
          scriptId={remixScriptId}
          onClose={()=> setRemixScriptId(null)}
          currentUser={currentUser}
      personalCollectedId={remixCollectedId || undefined}
      onRemixCompleted={(newScript)=> { window.dispatchEvent(new Event('userDataUpdated')); setRemixCollectedId(null); }}
        />
      )}
    <RateScriptModal
      open={rateModalOpen}
      onClose={()=>{ setRateModalOpen(false); setRateTarget(null); }}
      scriptId={rateTarget? (rateTarget.originalScriptId || rateTarget.id): ''}
      displayTitle={rateTarget?.title || ''}
      userId={currentUser.id}
      onRated={handleRated}
    />
    </div>
  );
}
