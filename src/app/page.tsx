'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import LoginForm from '@/components/LoginForm';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Check login status from session storage when page loads
  useEffect(() => {
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        sessionStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);
  
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Save login status to session storage
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  };
  
  const handleLogout = async () => {
    if (currentUser) {
      // Call API to update user offline status
      try {
        await fetch('/api/users/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: currentUser.id }),
        });
      } catch (error) {
        console.error('Failed to logout:', error);
      }
    }
    
    setCurrentUser(null);
    sessionStorage.removeItem('currentUser');
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-game-bg via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🎭</div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (currentUser) {
    return <Dashboard user={currentUser} onLogout={handleLogout} />;
  }
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-game-bg via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-game-accent via-yellow-400 to-orange-500 bg-clip-text text-transparent mb-4 animate-fade-in">
            LLM Reasoning Master
          </h1>
          <p className="text-xl text-gray-300 animate-slide-up">
            AI-powered Script Murder Mystery Game Platform
          </p>
        </div>
        
        <div className="max-w-md mx-auto">
          <div className="card animate-slide-up">
            <h2 className="text-2xl font-semibold text-center mb-6">Login to Game</h2>
            
            <LoginForm onLogin={handleLogin} />
            
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Test Accounts:</h3>
              <div className="text-sm text-gray-400 space-y-1">
                <p>Username: 小明、小林、小宝</p>
                <p>Password: 123456</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="card text-center">
              <div className="text-3xl mb-4">🎭</div>
              <h3 className="text-lg font-semibold mb-2">AI-Powered</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                • Intelligent NPCs participate in discussions<br/>
                • AI custom-generates script content<br/>
                • Creates stories based on specific requirements<br/>
                • Automatically assigns character clues
              </p>
            </div>
            
            <div className="card text-center">
              <div className="text-3xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2">Multiplayer Game</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                • Real-time display of friends' online status<br/>
                • Create rooms and invite friends<br/>
                • Support 4-8 players simultaneously<br/>
                • Spectator mode for anytime joining
              </p>
            </div>
            
            <div className="card text-center">
              <div className="text-3xl mb-4">📚</div>
              <h3 className="text-lg font-semibold mb-2">Script Collection</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                • Collect exciting game scripts<br/>
                • Share stories with friends<br/>
                • Interactive script editing<br/>
                • One-click replay of classic scripts
              </p>
            </div>
          </div>
        </div>
        
        {/* AI Script Generation Features */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-semibold text-white mb-8">🤖 AI Intelligent Script Generation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-xl p-4 border border-purple-500/30">
              <div className="text-2xl mb-3">✨</div>
              <h4 className="text-md font-semibold text-white mb-2">Custom Plot</h4>
              <p className="text-gray-300 text-sm">Input plot requirements, AI generates exclusive story background</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-600/20 to-teal-600/20 rounded-xl p-4 border border-green-500/30">
              <div className="text-2xl mb-3">🎯</div>
              <h4 className="text-md font-semibold text-white mb-2">Round Design</h4>
              <p className="text-gray-300 text-sm">Customize game rounds, intelligently allocate plot pacing</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 rounded-xl p-4 border border-orange-500/30">
              <div className="text-2xl mb-3">🔍</div>
              <h4 className="text-md font-semibold text-white mb-2">Clue Distribution</h4>
              <p className="text-gray-300 text-sm">Generate unique private clues for each player</p>
            </div>
            
            <div className="bg-gradient-to-br from-pink-600/20 to-purple-600/20 rounded-xl p-4 border border-pink-500/30">
              <div className="text-2xl mb-3">📝</div>
              <h4 className="text-md font-semibold text-white mb-2">Script Editing</h4>
              <p className="text-gray-300 text-sm">Collaborative script editing through dialogue with AI</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
