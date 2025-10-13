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
    // 确保立即获取最新的用户数据
    fetchUserData();
    fetchRooms();
  fetchFriends();
  fetchStyleGrants();
    
    // 添加自定义事件监听器来刷新用户数据
    const handleUserDataUpdate = () => {
      fetchUserData();
    };
    
    window.addEventListener('userDataUpdated', handleUserDataUpdate);
    
    return () => {
      window.removeEventListener('userDataUpdated', handleUserDataUpdate);
    };
  }, [user.id]); // 添加user.id作为依赖

  // 获取最新的用户数据
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
          // 更新 sessionStorage 中的用户数据
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

  // 轮询刷新房间列表，让大厅自动出现新房间（无需手动刷新）
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/rooms');
        const data = await response.json();
        if (data.success) {
          setRooms(data.rooms);
        }
      } catch (error) {
        // 静默失败即可，避免打扰用户
      }
    }, 2000); // 每2秒拉取一次

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
        // 更新房间列表，新房间添加到最前面
        setRooms([data.room, ...rooms]);
        setShowCreateRoom(false);
        
        // 自动进入新创建的房间
        window.location.href = `/room/${data.room.id}`;
      }
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  // 从收藏剧本创建游戏
  const createGameFromCollectedScript = (collectedScript: any) => {
    setSelectedCollectedScript(collectedScript);
    setShowCreateRoom(true);
  };

  // 处理导入剧本成功
  const handleImportSuccess = () => {
    // 刷新用户数据以获取最新的收藏剧本
    fetchUserData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-game-bg via-slate-800 to-slate-900">
      {/* 头部导航 */}
      <header className="bg-game-card border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-game-accent to-yellow-400 bg-clip-text text-transparent">
                LLM推理大师
              </h1>
              <span className="text-gray-400">|</span>
              <span className="text-white">欢迎, {currentUser.username}</span>
            </div>
            
            <button
              onClick={onLogout}
              className="btn-secondary px-4 py-2"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* 左侧栏 */}
          <div className="col-span-4 space-y-6">
            {/* 好友列表 */}
            <div className="h-80">
              <div className="card h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <span className="mr-2">👥</span>
                    好友列表
                  </h2>
                  <span className="text-sm text-gray-400">
                    {friends.filter((f: any) => f.isOnline).length}/{friends.length} 在线
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <FriendsList friends={friends} currentUserId={currentUser.id} styleGrants={styleGrants} onToggleGrant={toggleGrant} onChat={(f:any)=> setChatFriend(f)} />
                </div>
              </div>
            </div>

            {/* 收藏剧本 */}
            <div className="h-80">
              <div className="card h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <span className="mr-2">📚</span>
                    收藏剧本
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowImportScript(true)}
                      className="text-sm bg-game-accent hover:bg-opacity-80 text-white px-3 py-1 rounded transition-colors"
                      title="导入外部PDF剧本"
                    >
                      📥 PDF导入
                    </button>
                    <button
                      onClick={() => setShowTestImport(true)}
                      className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                      title="文本导入测试"
                    >
                      🧪 测试导入
                    </button>
                    <span className="text-sm text-gray-400">
                      {currentUser?.collectedScripts?.length || 0} 个
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {(!currentUser?.collectedScripts || currentUser.collectedScripts.length === 0) ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">📖</div>
                      <p className="text-gray-400 text-sm">暂无收藏剧本</p>
                      <p className="text-gray-500 text-xs mt-1">完成游戏后可收藏喜欢的剧本</p>
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
                            {script.rounds}轮 · {script.collectedAt ? new Date(script.collectedAt).toLocaleDateString() : '收藏时间未知'}
                          </p>
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                            {script.background}
                          </p>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setRemixScriptId(script.originalScriptId || script.id); setRemixCollectedId(script.id); }}
                              className="text-xs px-2 py-1 bg-purple-600/40 hover:bg-purple-600/60 text-purple-200 rounded"
                            >二次创作</button>
                            <button
                              type="button"
                              onClick={(e)=> { e.stopPropagation(); openRate(script); }}
                              className="text-xs px-2 py-1 bg-yellow-600/40 hover:bg-yellow-600/60 text-yellow-200 rounded"
                            >评分</button>
                            {!script.derivativeOfScriptId && (
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const priceStr = prompt('请输入上架价格(>=0整数):','10');
                                  if (priceStr === null) return;
                                  const p = parseInt(priceStr,10);
                                  if (Number.isNaN(p) || p < 0) { alert('价格无效'); return; }
                                  try {
                                    const res = await fetch('/api/scripts/collected/publish', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id, collectedScriptId: script.id, price: p }) });
                                    const data = await res.json();
                                    if (data.success) { 
                                      alert('上架成功'); 
                                      // 触发数据刷新事件
                                      window.dispatchEvent(new Event('userDataUpdated'));
                                    }
                                    else alert(data.error || '上架失败');
                                  } catch { alert('网络错误'); }
                                }}
                                className="text-xs px-2 py-1 bg-green-600/40 hover:bg-green-600/60 text-green-200 rounded"
                              >上架</button>
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

          {/* 右侧栏 - 房间区域 */}
          <div className="col-span-8">
            <div className="card h-[calc(100vh-200px)] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white flex items-center">
                  <span className="mr-3">🎮</span>
                  游戏房间
                </h2>
                <button
                  onClick={() => setShowCreateRoom(true)}
                  className="btn-primary px-6 py-3 text-lg flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>创建房间</span>
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

      {/* 创建房间模态框 */}
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

      {/* 导入剧本模态框 */}
      {showImportScript && (
        <ImportScriptModal
          isOpen={showImportScript}
          onClose={() => setShowImportScript(false)}
          onSuccess={handleImportSuccess}
          currentUserId={currentUser?.id}
        />
      )}

      {/* 测试导入模态框 */}
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
