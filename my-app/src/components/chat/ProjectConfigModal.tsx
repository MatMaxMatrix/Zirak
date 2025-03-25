import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

interface ProjectConfig {
  name: string;
  description: string;
  type: 'web' | 'mobile' | 'desktop' | 'other';
  framework?: string;
  language: string;
}

interface ProjectConfigModalProps {
  project?: any;
  onClose: () => void;
  onSave: (project: any) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function ProjectConfigModal({ 
  project,
  onClose, 
  onSave,
  isLoading = false,
  error = null
}: ProjectConfigModalProps) {
  const [config, setConfig] = useState<ProjectConfig>({
    name: project?.name || '',
    description: project?.config?.description || '',
    type: project?.config?.type || 'web',
    language: project?.config?.language || 'typescript',
    framework: project?.config?.framework || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const updatedProject = {
        ...project,
        name: config.name,
        config: {
          description: config.description,
          type: config.type,
          language: config.language,
          framework: config.framework
        }
      };
      
      onSave(updatedProject);
    } catch (error) {
      console.error('Error saving project configuration:', error);
    }
  };

  if (!project) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1D1D1D] rounded-lg w-[500px] p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Create New Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
            disabled={isLoading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-md text-red-200">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Project Name
            </label>
            <input
              type="text"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              className="w-full bg-[#2D2D2D] text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Description
            </label>
            <textarea
              value={config.description}
              onChange={(e) => setConfig({ ...config, description: e.target.value })}
              className="w-full bg-[#2D2D2D] text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Project Type
            </label>
            <select
              value={config.type}
              onChange={(e) => setConfig({ ...config, type: e.target.value as ProjectConfig['type'] })}
              className="w-full bg-[#2D2D2D] text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="web">Web Application</option>
              <option value="mobile">Mobile Application</option>
              <option value="desktop">Desktop Application</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Programming Language
            </label>
            <select
              value={config.language}
              onChange={(e) => setConfig({ ...config, language: e.target.value })}
              className="w-full bg-[#2D2D2D] text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="go">Go</option>
            </select>
          </div>

          {config.type === 'web' && (
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Framework
              </label>
              <select
                value={config.framework}
                onChange={(e) => setConfig({ ...config, framework: e.target.value })}
                className="w-full bg-[#2D2D2D] text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="">Select a framework</option>
                <option value="next">Next.js</option>
                <option value="react">React</option>
                <option value="vue">Vue.js</option>
                <option value="angular">Angular</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-200 hover:text-white"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 ${
                isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'
              }`}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? 'Creating...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 