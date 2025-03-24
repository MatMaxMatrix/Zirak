import { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Globe } from 'lucide-react';

interface PreviewProps {
  url: string;
  isLoading?: boolean;
}

export function Preview({ url, isLoading = false }: PreviewProps) {
  const [currentUrl, setCurrentUrl] = useState(url);
  const [urlInput, setUrlInput] = useState(url);
  const [history, setHistory] = useState<string[]>([url]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim() && urlInput !== currentUrl) {
      setCurrentUrl(urlInput);
      setHistory(prev => [...prev.slice(0, historyIndex + 1), urlInput]);
      setHistoryIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setCurrentUrl(history[historyIndex - 1]);
      setUrlInput(history[historyIndex - 1]);
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setCurrentUrl(history[historyIndex + 1]);
      setUrlInput(history[historyIndex + 1]);
    }
  };

  const handleRefresh = () => {
    // Simulate refresh by triggering a re-render of the iframe
    setCurrentUrl('');
    setTimeout(() => setCurrentUrl(urlInput), 100);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg overflow-hidden">
      {/* Browser Chrome */}
      <div className="bg-[#1D1D1D] border-b border-[#2D2D2D] p-2 flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={handleBack}
            disabled={historyIndex === 0}
            className="p-1 hover:bg-[#2D2D2D] rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4 text-gray-400" />
          </button>
          <button
            onClick={handleForward}
            disabled={historyIndex === history.length - 1}
            className="p-1 hover:bg-[#2D2D2D] rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </button>
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-[#2D2D2D] rounded"
          >
            <RotateCw className="h-4 w-4 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleUrlSubmit} className="flex-1">
          <div className="flex items-center bg-[#0C0C0C] rounded px-2">
            <Globe className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-300 px-2 py-1 focus:outline-none"
              placeholder="Enter URL"
            />
          </div>
        </form>
      </div>

      {/* Browser Content */}
      <div className="flex-1 bg-white">
        {isLoading ? (
          <div className="h-full flex items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : currentUrl ? (
          <iframe
            src={currentUrl}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-white text-gray-400">
            No URL specified
          </div>
        )}
      </div>
    </div>
  );
} 