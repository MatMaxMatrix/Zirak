import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(false);

  // Update state when url prop changes
  useEffect(() => {
    if (url && url !== currentUrl) {
      setCurrentUrl(url);
      setUrlInput(url);
      setHistory(prev => [...prev, url]);
      setHistoryIndex(prev => prev + 1);
    }
  }, [url]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim() && urlInput !== currentUrl) {
      setLoading(true);
      
      // Ensure URL has protocol
      let processedUrl = urlInput.trim();
      if (!/^https?:\/\//i.test(processedUrl)) {
        // If it looks like a search query instead of a URL, convert it to a search
        if (processedUrl.includes(' ') || !processedUrl.includes('.')) {
          processedUrl = `https://www.bing.com/search?q=${encodeURIComponent(processedUrl)}`;
        } else {
          processedUrl = `https://${processedUrl}`;
        }
        setUrlInput(processedUrl);
      }
      
      setCurrentUrl(processedUrl);
      setHistory(prev => [...prev.slice(0, historyIndex + 1), processedUrl]);
      setHistoryIndex(prev => prev + 1);
      
      // Reset loading state after a delay
      setTimeout(() => setLoading(false), 1000);
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
    // Set loading state
    setLoading(true);
    
    // Simulate refresh by triggering a re-render of the iframe
    setCurrentUrl('');
    setTimeout(() => {
      setCurrentUrl(history[historyIndex]);
      setLoading(false);
    }, 500);
  };

  // Determine if we should show loading state
  const showLoading = isLoading || loading;

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
        {showLoading ? (
          <div className="h-full flex items-center justify-center bg-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : currentUrl ? (
          <iframe
            src={currentUrl}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            referrerPolicy="no-referrer"
            allow="encrypted-media; midi; payment; camera=(), microphone=(), geolocation=(), gyroscope=(), accelerometer=(), xr-spatial-tracking=()"
            onLoad={() => setLoading(false)}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-white text-gray-400">
            No URL specified
          </div>
        )}
      </div>
      
      <div className="bg-[#1D1D1D] border-t border-[#2D2D2D] p-2 text-xs text-gray-400 text-center">
        Some websites may not load due to iframe security restrictions
      </div>
    </div>
  );
} 