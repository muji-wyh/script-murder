'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import LoginForm from '@/components/LoginForm';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 页面加载时检查会话存储的登录状态
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
    // 保存登录状态到会话存储
    sessionStorage.setItem('currentUser', JSON.stringify(user));
  };
  
  const handleLogout = async () => {
    if (currentUser) {
      // 调用API更新用户离线状态
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
  
  // 加载中状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-game-bg via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🎭</div>
          <p className="text-white text-lg">正在加载...</p>
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
            LLM推理大师
          </h1>
          <p className="text-xl text-gray-300 animate-slide-up">
            基于AI的剧本杀游戏平台
          </p>
        </div>
        
        <div className="max-w-md mx-auto">
          <div className="card animate-slide-up">
            <h2 className="text-2xl font-semibold text-center mb-6">登录游戏</h2>
            
            <LoginForm onLogin={handleLogin} />
            
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <h3 className="text-sm font-medium text-gray-300 mb-2">测试账号：</h3>
              <div className="text-sm text-gray-400 space-y-1">
                <p>用户名：小明、小林、小宝</p>
                <p>密码：123456</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="card text-center">
              <div className="text-3xl mb-4">🎭</div>
              <h3 className="text-lg font-semibold mb-2">AI驱动</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                • 智能NPC参与游戏讨论<br/>
                • AI定制生成剧本内容<br/>
                • 根据指定要求创作故事<br/>
                • 自动分配角色线索
              </p>
            </div>
            
            <div className="card text-center">
              <div className="text-3xl mb-4">👥</div>
              <h3 className="text-lg font-semibold mb-2">多人游戏</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                • 好友在线状态实时显示<br/>
                • 创建房间邀请好友<br/>
                • 支持4-8人同时游戏<br/>
                • 观战模式随时加入
              </p>
            </div>
            
            <div className="card text-center">
              <div className="text-3xl mb-4">📚</div>
              <h3 className="text-lg font-semibold mb-2">剧本收藏</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                • 收藏精彩游戏剧本<br/>
                • 与好友分享故事<br/>
                • 对话式编辑剧本<br/>
                • 一键重玩经典剧本
              </p>
            </div>
          </div>
        </div>
        
        {/* AI剧本生成特色展示 */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-semibold text-white mb-8">🤖 AI智能剧本生成</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-purple-600/20 to-blue-600/20 rounded-xl p-4 border border-purple-500/30">
              <div className="text-2xl mb-3">✨</div>
              <h4 className="text-md font-semibold text-white mb-2">定制剧情</h4>
              <p className="text-gray-300 text-sm">输入剧情要求，AI生成专属故事背景</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-600/20 to-teal-600/20 rounded-xl p-4 border border-green-500/30">
              <div className="text-2xl mb-3">🎯</div>
              <h4 className="text-md font-semibold text-white mb-2">轮次设计</h4>
              <p className="text-gray-300 text-sm">自定义游戏轮数，智能分配剧情节奏</p>
            </div>
            
            <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 rounded-xl p-4 border border-orange-500/30">
              <div className="text-2xl mb-3">🔍</div>
              <h4 className="text-md font-semibold text-white mb-2">线索分配</h4>
              <p className="text-gray-300 text-sm">为每个玩家生成独特的私人线索</p>
            </div>
            
            <div className="bg-gradient-to-br from-pink-600/20 to-purple-600/20 rounded-xl p-4 border border-pink-500/30">
              <div className="text-2xl mb-3">📝</div>
              <h4 className="text-md font-semibold text-white mb-2">剧本编辑</h4>
              <p className="text-gray-300 text-sm">与AI对话式协作编辑完善剧本</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
