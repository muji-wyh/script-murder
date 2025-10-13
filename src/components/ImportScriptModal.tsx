import { useState } from 'react';

interface ImportScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserId?: string;
}

export default function ImportScriptModal({ isOpen, onClose, onSuccess, currentUserId }: ImportScriptModalProps) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [overridePlayers, setOverridePlayers] = useState<string>('');
  const [overrideRounds, setOverrideRounds] = useState<string>('');
  const [appcode, setAppcode] = useState<string>('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
    setUploadStatus('');
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setUploadStatus('请选择至少一个PDF文件');
      return;
    }

    setIsUploading(true);
    setUploadStatus('正在分析PDF文件...');

    try {
      const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
        formData.append('pdfs', files[i]);
      }

  if (currentUserId) formData.append('userId', currentUserId);

  if (overridePlayers) formData.append('recommendedPlayerCount', overridePlayers);
  if (overrideRounds) formData.append('rounds', overrideRounds);
  if (appcode) formData.append('appcode', appcode.trim());
  const response = await fetch('/api/scripts/import-pdf', { method: 'POST', body: formData });

      const result = await response.json();

      if (result.success) {
        setUploadStatus(`成功导入剧本：${result.script.title}`);
        setTimeout(() => {
          onSuccess();
          onClose();
          setFiles(null);
          setUploadStatus('');
        }, 2000);
      } else {
        setUploadStatus(`导入失败：${result.error}`);
      }
    } catch (error) {
      console.error('上传失败:', error);
      setUploadStatus('上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      onClose();
      setFiles(null);
      setUploadStatus('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-game-card rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">导入外部剧本</h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-white disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              选择PDF文件
            </label>
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={handleFileChange}
              disabled={isUploading}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-sm file:bg-game-accent file:text-white hover:file:bg-opacity-80 disabled:opacity-50"
            />
            <p className="text-xs text-gray-400 mt-1">
              支持多个PDF文件，LLM将分析内容并生成可玩的剧本
            </p>
          </div>

          {files && files.length > 0 && (
            <div className="text-sm text-gray-300">
              <p className="font-medium mb-1">已选择文件：</p>
              <ul className="space-y-1">
                {Array.from(files).map((file, index) => (
                  <li key={index} className="truncate">
                    📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">玩家人数(可选覆盖)</label>
              <input
                type="number"
                min={3}
                max={12}
                value={overridePlayers}
                onChange={e => setOverridePlayers(e.target.value)}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                placeholder="自动"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">轮数(1-25)</label>
              <input
                type="number"
                min={1}
                max={25}
                value={overrideRounds}
                onChange={e => setOverrideRounds(e.target.value)}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                placeholder="自动"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">临时 AppCode (仅本地调试)</label>
            <input
              type="text"
              value={appcode}
              onChange={e=>setAppcode(e.target.value)}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
              placeholder="可留空，优先使用环境变量"
            />
          </div>

          <div className="text-xs text-gray-400 leading-relaxed space-y-1">
            <p>说明：LLM 会自动融合多个PDF为一个剧本，智能决定轮数(1-25)与玩家人数。</p>
            <p>OCR若环境变量未生效，可在上方填写临时 AppCode 测试（不会保存）。</p>
            <p>若你的真人好友少于推荐人数，创建房间时可添加 AI NPC 补齐。</p>
          </div>

          {uploadStatus && (
            <div
              className={`p-3 rounded-md whitespace-pre-wrap text-sm ${
                uploadStatus.includes('成功')
                  ? 'bg-green-900 text-green-300'
                  : uploadStatus.includes('失败')
                    ? 'bg-red-900 text-red-300'
                    : 'bg-blue-900 text-blue-300'
              }`}
            >
              {uploadStatus}
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || !files || files.length === 0}
              className="flex-1 px-4 py-2 bg-game-accent text-white rounded-md hover:bg-opacity-80 disabled:opacity-50 flex items-center justify-center"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  分析中...
                </>
              ) : (
                '导入剧本'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
