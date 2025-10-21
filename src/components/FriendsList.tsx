'use client';

interface Friend {
  id: string;
  username: string;
  isOnline: boolean;
}

interface FriendsListProps {
  friends: Friend[];
  currentUserId?: string;
  styleGrants?: string[]; // Friend IDs authorized by current user
  onToggleGrant?: (friendId: string, isGranted: boolean) => void;
  onChat?: (friend: Friend) => void;
}

export default function FriendsList({ friends, styleGrants = [], onToggleGrant, onChat }: FriendsListProps) {
  if (friends.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">�</div>
        <p className="text-gray-400 text-sm">No friends</p>
        <p className="text-gray-500 text-xs mt-1">Add friends to play together</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {friends.map((friend) => (
        <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
          <div className="flex items-center space-x-3">
            <div className={`w-2 h-2 rounded-full ${
              friend.isOnline ? 'bg-green-500' : 'bg-gray-500'
            }`}></div>
            <div>
              <h4 className="text-white text-sm font-medium">{friend.username}</h4>
              <p className="text-xs text-gray-400">
                {friend.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-1">
            <button className="btn-secondary px-2 py-1 text-xs" onClick={() => onChat && onChat(friend)}>
              Chat
            </button>
            {friend.isOnline && (
              <button className="btn-primary px-2 py-1 text-xs">
                Invite
              </button>
            )}
            {onToggleGrant && (
              <button
                className={`px-2 py-1 text-xs rounded ${styleGrants.includes(friend.id) ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-slate-600 hover:bg-slate-500 text-white'}`}
                title="Authorize/Revoke using my speaking style for friend's AI NPC"
                onClick={() => onToggleGrant(friend.id, styleGrants.includes(friend.id))}
              >
                {styleGrants.includes(friend.id) ? 'Authorized' : 'Grant Style'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
