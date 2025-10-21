'use client';

import { useState } from 'react';

interface CreateRoomModalProps {
  onClose: () => void;
  onSubmit: (roomData: any) => void;
  collectedScript?: any; // Optional collected script
}

export default function CreateRoomModal({ onClose, onSubmit, collectedScript }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('Input change:', e.target.value);
    setRoomName(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim()) return;
    
    const roomData = {
      name: roomName.trim()
    };

    // If creating from collected script, add script info
    if (collectedScript) {
      (roomData as any).collectedScript = collectedScript;
    }
    
    onSubmit(roomData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => e.stopPropagation()}>
      <div className="bg-game-card rounded-xl p-6 w-full max-w-md mx-4 relative z-60" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white">
            {collectedScript ? 'Create Room from Collected Script' : 'Create Game Room'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* If creating from collected script, display script info */}
        {collectedScript && (
          <div className="mb-6 p-4 bg-purple-600/20 border border-purple-500/30 rounded-lg">
            <h3 className="text-white font-medium mb-2">📚 {collectedScript.title}</h3>
            <p className="text-purple-200 text-sm mb-2">{collectedScript.rounds} rounds game</p>
            <p className="text-purple-300 text-xs line-clamp-3">
              {collectedScript.background}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {collectedScript.characters?.map((char: any, index: number) => (
                <span 
                  key={index}
                  className={`text-xs px-2 py-1 rounded ${
                    char.isMainCharacter 
                      ? 'bg-yellow-600/30 text-yellow-200' 
                      : 'bg-blue-600/30 text-blue-200'
                  }`}
                >
                  {char.name} {char.isMainCharacter ? '(Human)' : '(AI)'}
                </span>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Room Name
            </label>
            <input
              type="text"
              value={roomName}
              onChange={handleInputChange}
              onFocus={(e) => console.log('Input focused')}
              onClick={(e) => console.log('Input clicked')}
              className="input-field w-full cursor-text"
              placeholder="Please enter room name"
              autoComplete="off"
              autoFocus
              style={{
                pointerEvents: 'auto',
                userSelect: 'text',
                fontSize: '16px',
                lineHeight: '1.5'
              }}
              required
            />
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-300 text-sm">
              {collectedScript ? (
                <>
                  ⚡ Creating room based on collected script. Script information will be automatically configured after entering the room.
                  <br />
                  Human player count and AI count will be set according to the original script.
                </>
              ) : (
                '💡 After creating the room, you can set story requirements, game rounds in the room, and invite friends or add AI NPCs to participate in the game.'
              )}
            </p>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1 py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 py-3"
            >
              Create Room
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
