"use client";
import { useEffect, useState } from 'react';
import RatingStars from './RatingStars';
import PurchaseScriptModal from './PurchaseScriptModal';

export default function ScriptStore({ currentUser }: { currentUser: any }) {
  const [scripts, setScripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/scripts?listed=1');
      const data = await res.json();
      if (data.success) setScripts(data.scripts || []); else setError(data.error || '加载失败');
    } catch(e:any){ setError('网络错误'); }
    setLoading(false);
  };
  useEffect(()=>{ load(); },[]);

  useEffect(()=>{
    // 从 profile 获取余额
    const fetchProfile = async () => {
      if (!currentUser?.id) return;
      try { const res = await fetch(`/api/users/${currentUser.id}/profile`); const data = await res.json(); if(data.success) setBalance(data.user.balance ?? 100); } catch {}
    };
    fetchProfile();
  },[currentUser?.id]);

  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [purchaseTarget, setPurchaseTarget] = useState<any>(null);
  const openPurchase = (script:any) => { setPurchaseTarget(script); setPurchaseOpen(true); };
  const handlePurchased = (b:number) => { setBalance(b); };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center"><span className="mr-2">🛒</span>剧本商店</h2>
        <div className="text-sm text-gray-300">余额：{balance ?? '...'} 元</div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3">
        {loading && <div className="text-gray-400 text-sm">加载中...</div>}
        {error && <div className="text-red-400 text-sm">{error}</div>}
        {!loading && !error && scripts.length === 0 && <div className="text-gray-500 text-sm">暂无在售剧本</div>}
        {scripts.map(s => {
          const owned = currentUser?.purchasedScripts?.includes(s.id) || s.createdBy === currentUser?.id;
          return (
            <div key={s.id} className="bg-gray-800/70 rounded p-3 hover:bg-gray-700/60 transition-colors">
              <div className="flex items-center justify-between">
                <div className="text-white font-medium text-sm">{s.title}</div>
                <div className="text-xs text-gray-400">作者: {s.originalAuthorId || s.createdBy}</div>
              </div>
              <div className="mt-1 text-xs text-gray-400 line-clamp-2">{s.background}</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RatingStars value={s.averageRating || 0} onChange={undefined} size={14} />
                  <span className="text-xs text-gray-500">({s.ratingCount || 0})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-yellow-400">¥{s.price || 0}</span>
                  <button disabled={owned} onClick={()=> openPurchase(s)} className={`px-2 py-1 rounded text-xs ${owned? 'bg-gray-600 text-gray-300':'bg-game-accent text-white hover:bg-opacity-80'}`}>{owned? '已拥有':'购买'}</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    <PurchaseScriptModal
      open={purchaseOpen}
      onClose={()=> { setPurchaseOpen(false); setPurchaseTarget(null); }}
      script={purchaseTarget}
      userId={currentUser?.id}
      balance={balance}
      onPurchased={handlePurchased}
    />
    </div>
  );
}