"use client";
import { useState } from 'react';
import RatingStars from './RatingStars';
import Modal from './Modal';

interface RateScriptModalProps {
  open: boolean;
  onClose: () => void;
  scriptId: string; // original script id
  displayTitle: string;
  userId: string;
  onRated?: (rating: number) => void;
}

export default function RateScriptModal({ open, onClose, scriptId, displayTitle, userId, onRated }: RateScriptModalProps) {
  const [tempRating, setTempRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!tempRating) { setMessage('Please select a star rating'); return; }
    setSubmitting(true); setMessage(null);
    try {
      const res = await fetch(`/api/scripts/${scriptId}/rating`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId, rating: tempRating }) });
      const data = await res.json();
      if (data.success) { setMessage('Rating submitted successfully'); onRated && onRated(tempRating); }
      else setMessage(data.error || 'Rating failed');
    } catch { setMessage('Network error'); }
    setSubmitting(false);
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={`Rate Script`}> 
      <div className="space-y-5">
        <div>
          <div className="text-sm text-gray-400 mb-1">Script</div>
          <div className="text-white font-medium">{displayTitle}</div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-2">Select Rating</div>
          <div className="flex items-center gap-4">
            <RatingStars value={tempRating} onChange={v=> setTempRating(v)} size={30} interactive />
            {tempRating>0 && <span className="text-game-accent text-sm">{tempRating} stars</span>}
          </div>
          <p className="text-xs text-gray-500 mt-2">Click the Nth star to rate {`>`}= N stars. Click the same star again to reselect.</p>
        </div>
        {message && <div className={`text-sm ${message.includes('successfully')? 'text-green-400':'text-red-400'}`}>{message}</div>}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} disabled={submitting} className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white text-sm disabled:opacity-50">Close</button>
          <button onClick={submit} disabled={submitting} className="px-4 py-2 rounded bg-game-accent hover:bg-opacity-80 text-white text-sm font-medium disabled:opacity-50">{submitting? 'Submitting...':'Submit Rating'}</button>
        </div>
      </div>
    </Modal>
  );
}
