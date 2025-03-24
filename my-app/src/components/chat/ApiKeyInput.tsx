import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ApiKeyInputProps {
  onSubmit: (apiKey: string) => void;
}

export function ApiKeyInput({ onSubmit }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSubmit(apiKey.trim());
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0C0C0C] text-white p-4">
      <div className="w-full max-w-[600px] mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          AutoGen Stock Assistant
        </h1>
        
        <div className="bg-[#1D1D1D] rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-4">
            Enter your OpenAI API Key
          </h2>
          <p className="text-gray-400 mb-6">
            Your API key is stored locally in your browser and is only used to communicate with the AutoGen agents.
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-[#0C0C0C] text-gray-300 px-4 py-2 rounded-md border border-[#2D2D2D] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button
              type="submit"
              disabled={!apiKey.trim()}
              className="w-[100px] bg-white text-black hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400"
            >
              Set Key
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 