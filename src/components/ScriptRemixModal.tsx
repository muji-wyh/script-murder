"use client";
import { useEffect, useState } from 'react';
import RatingStars from './RatingStars';

interface ScriptRemixModalProps {
  scriptId: string; // Original script ID (or root script ID)
  personalCollectedId?: string; // Current user's personal collected copy ID (if editing own copy)
  onClose: () => void;
  currentUser: any;
  onRemixCompleted?: (script:any)=>void;
}

export default function ScriptRemixModal({ scriptId, personalCollectedId, onClose, currentUser, onRemixCompleted }: ScriptRemixModalProps) {
  const [baseScript, setBaseScript] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [instructions, setInstructions] = useState('');
  const [working, setWorking] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [overwrite, setOverwrite] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      if (personalCollectedId) {
        // Load user's personal collected copy
        const res = await fetch(`/api/users/${currentUser.id}/profile`);
        if (!res.ok) {
          setError(`Request failed (${res.status})`);
        } else {
          const data = await res.json();
            if (data.success) {
              const cs = (data.user.collectedScripts || []).find((c:any)=> c.id === personalCollectedId);
              if (cs) setBaseScript(cs); else setError('Personal collected copy not found');
            } else setError(data.error||'Load failed');
        }
      } else {
        const res = await fetch(`/api/scripts/${scriptId}`);
        if (!res.ok) {
          setError(`Request failed (${res.status})`);
        } else {
          const data = await res.json();
          if (data.success) setBaseScript(data.script); else setError(data.error||'Load failed');
        }
      }
    } catch (e:any) {
      setError('Network error: Service may not be started or disconnected');
    }
    setLoading(false);
  };

  useEffect(()=> { load(); },[scriptId]);

  const applyRemix = async () => {
    if (!instructions.trim()) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/scripts/${scriptId}/remix`, { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId: currentUser.id, instructions, overwrite, personalCollectedId }) });
      const data = await res.json();
      if (data.success) {
        const updated = data.script || data.collectedScript;
        if (updated) {
          setPreview(updated);
          // If editing personal copy, update base script too
          if (data.personal) setBaseScript(updated);
          setHistory(h => [...h, { at: Date.now(), instructions, script: updated }]);
        }
        setInstructions('');
        // If returned collected or overwrite succeeded, trigger external user data refresh
        if (data.collected || data.overwritten || data.personal) {
          window.dispatchEvent(new Event('userDataUpdated'));
        }
      } else {
        alert(data.error || 'Modification failed');
      }
    } catch { alert('Network error'); }
    setWorking(false);
  };

  const finish = () => {
    if (!preview) { alert('No modified version generated yet'); return; }
    onRemixCompleted && onRemixCompleted(preview);
    onClose();
  };

  const showScript = preview || baseScript;
  const persistentHistory = (baseScript?.remixHistory || []) as any[];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-game-card w-full max-w-6xl h-[90vh] rounded-xl flex flex-col overflow-hidden" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <div className="text-white font-semibold text-lg">Derivative Creation: {baseScript?.title || '...'}</div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          {/* Left side original/preview */}
          <div className="w-2/3 border-r border-gray-700 flex flex-col">
            <div className="p-4 overflow-y-auto text-sm text-gray-300 leading-relaxed space-y-6">
              {loading && <div>Loading...</div>}
              {error && (
                <div className="space-y-2">
                  <div className="text-red-400">{error}</div>
                  <button onClick={load} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white">Retry</button>
                </div>
              )}
              {showScript && (
                <>
                  <section>
                    <h3 className="text-white font-medium mb-2">Background</h3>
                    <p className="whitespace-pre-wrap">{showScript.background}</p>
                  </section>
                  <section>
                    <h3 className="text-white font-medium mb-2">Characters</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {showScript.characters.map((c:any)=>(
                        <div key={c.id} className="bg-gray-800/60 p-2 rounded">
                          <div className="text-white text-xs font-semibold">{c.name}</div>
                          <div className="text-gray-400 text-xs">{c.identity}</div>
                          <div className="text-gray-500 text-[11px] line-clamp-2">{c.personality}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                  <section>
                    <h3 className="text-white font-medium mb-2">Round Plots</h3>
                    <div className="space-y-4">
                      {showScript.roundContents.map((r:any)=>(
                        <div key={r.round} className="bg-gray-800/40 p-3 rounded">
                          <div className="text-purple-300 font-medium mb-1">Round {r.round}</div>
                          <p className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto">{r.plot}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
          {/* Right side instruction area */}
          <div className="w-1/3 flex flex-col">
            <div className="p-4 space-y-3 border-b border-gray-700">
              <div className="text-white text-sm font-medium">Modification Instructions</div>
              <textarea value={instructions} onChange={e=> setInstructions(e.target.value)} className="w-full h-32 bg-gray-800 rounded p-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="Example: Modify the ending of Round 2 to add a plot twist clue, and change Character A's personality to be more paranoid" />
              {baseScript && currentUser?.id === baseScript.createdBy && (
                <label className="flex items-center gap-2 text-xs text-gray-400 select-none">
                  <input type="checkbox" checked={overwrite} onChange={e=> setOverwrite(e.target.checked)} className="accent-purple-500" />
                  Overwrite original script (original author only) – Will directly modify the original script instead of creating a new copy
                </label>
              )}
              <div className="flex gap-2">
                <button disabled={working || !instructions.trim()} onClick={applyRemix} className="px-3 py-2 bg-game-accent text-white rounded text-sm disabled:opacity-50">{working? 'Generating...':'Apply Changes'}</button>
                <button onClick={finish} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm">Finish and Save</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-gray-400">
              <div>
                <div className="text-gray-300 text-sm font-medium">New History Added This Session (Before Closing)</div>
                {history.length === 0 && <div className="text-gray-500">None</div>}
                {history.map(h => (
                  <div key={h.at} className="border border-gray-700 rounded p-2">
                    <div className="text-[10px] text-gray-500">{new Date(h.at).toLocaleTimeString()}</div>
                    <div className="text-gray-300 whitespace-pre-wrap">{h.instructions}</div>
                  </div>
                ))}
              </div>
              <div>
                <div className="text-gray-300 text-sm font-medium flex items-center gap-2">Cumulative History
                  <span className="text-[10px] text-gray-500">({persistentHistory.length})</span>
                </div>
                {persistentHistory.length === 0 && <div className="text-gray-500">No persistent history</div>}
                {persistentHistory.slice().reverse().map(entry => (
                  <div key={entry.at} className="border border-gray-800 rounded p-2 bg-gray-900/40">
                    <div className="flex justify-between">
                      <span className="text-[10px] text-gray-500">{new Date(entry.at).toLocaleString()}</span>
                      <span className="text-[10px] text-purple-400">Rounds:{(entry.changedRounds||[]).join(',')||'-'}</span>
                    </div>
                    <div className="text-gray-300 whitespace-pre-wrap mt-1">{entry.instructions}</div>
                    <div className="mt-1 text-[10px] text-gray-500 flex flex-wrap gap-2">
                      {entry.titleChanged && <span>Title✓</span>}
                      {entry.backgroundChanged && <span>Background✓</span>}
                      {(entry.changedCharacters||[]).length>0 && <span>Chars:{entry.changedCharacters.length}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}