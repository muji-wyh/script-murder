import { useState } from 'react';

interface TestImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TestImportModal({ isOpen, onClose, onSuccess }: TestImportModalProps) {
  const [textContent, setTextContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  if (!isOpen) return null;

  const handleImport = async () => {
    if (!textContent.trim()) {
      setUploadStatus('Please enter script content');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Analyzing script content...');

    try {
      const response = await fetch('/api/scripts/import-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ textContent }),
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus(`Successfully imported script: ${result.script.title}`);
        setTimeout(() => {
          onSuccess();
          onClose();
          setTextContent('');
          setUploadStatus('');
        }, 2000);
      } else {
        setUploadStatus(`Import failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      setUploadStatus('Import failed, please try again later');
    } finally {
      setIsUploading(false);
    }
  };

  const loadTestContent = () => {
    setTextContent(`Script Murder Mystery Test Script: "The Mysterious Restaurant"

Background Story:
On a foggy and rainy night, the famous French restaurant "Silver Rose" is hosting a private gathering. This restaurant is renowned for its exquisite French cuisine and elegant atmosphere, and tonight has invited several special guests for dinner.

However, halfway through the dinner, the lights suddenly went out. When they came back on, restaurant owner André was found collapsed in the wine cellar, already lifeless. The scene was in chaos, and everyone became a suspect.

Character Settings:

1. Annie (Head Chef)
- 30 years old, has worked at this restaurant for 5 years
- Passionate personality, with an extreme pursuit of culinary perfection
- Recently had disagreements with the owner about menu innovation

2. Mark (Sommelier)
- 28 years old, wine expert who knows all kinds of red wines like the back of his hand
- Usually quiet, but very observant
- Noticed the owner frequently going in and out of the wine cellar recently, behaving somewhat strangely

3. Sophie (Regular Customer)
- 45 years old, wealthy art collector
- VIP customer of the restaurant, often hosts gatherings here
- Rumored to have a special relationship with André

Plot Requirements:
Players need to find clues in the restaurant, talk to other characters, and ultimately identify the real killer. Each character has their own secrets and motives, and the truth is often hidden in the details.

Important Clues:
- A bottle of red wine was knocked over in the wine cellar
- André had a mysterious note in his pocket
- A knife is missing from the kitchen
- Sophie's handbag contains some strange pills

Game Objective:
Find the killer and uncover the secrets of the "Silver Rose" restaurant.`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Import Script (Test Version)</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Script Content
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              className="w-full h-64 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Please enter or paste script content..."
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadTestContent}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
            >
              Load Test Content
            </button>
          </div>

          {uploadStatus && (
            <div className={`p-3 rounded-md ${
              uploadStatus.includes('Successfully') 
                ? 'bg-green-800 text-green-100' 
                : uploadStatus.includes('failed') 
                  ? 'bg-red-800 text-red-100'
                  : 'bg-blue-800 text-blue-100'
            }`}>
              {uploadStatus}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isUploading || !textContent.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? 'Importing...' : 'Import Script'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
