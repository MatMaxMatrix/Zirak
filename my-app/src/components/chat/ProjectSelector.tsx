import { useState, useEffect } from 'react';
import { FolderOpen, Plus, ChevronDown } from 'lucide-react';
import { ProjectConfigModal } from './ProjectConfigModal';

interface Project {
  id: string;
  name: string;
  path: string;
  lastAccessed: string;
  config?: {
    description: string;
    type: string;
    language: string;
    framework?: string;
  };
}

interface ProjectSelectorProps {
  currentProject?: any;
  onSelect: (project: Project) => Promise<void>;
  onCreateProject: (project: Project) => Promise<void>;
  onConfigureProject: () => void;
  navbarMode?: boolean;
}

export function ProjectSelector({ 
  currentProject, 
  onSelect, 
  onCreateProject, 
  onConfigureProject,
  navbarMode = false
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch projects from localStorage or API
    const fetchProjects = async () => {
      try {
        // Set a timeout for the fetch to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch('/api/projects', {
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error response from projects API:', errorData);
          throw new Error(errorData.error || `Failed to fetch projects: ${response.status}`);
        }
        
        const data = await response.json();
        if (!Array.isArray(data.projects)) {
          console.error('Invalid projects data format:', data);
          throw new Error('Invalid projects data format');
        }
        
        setProjects(data.projects);
      } catch (error: any) {
        console.error('Error fetching projects:', error);
        // Show more user-friendly error
        if (error.name === 'AbortError') {
          console.warn('Projects API request timed out');
        }
        
        // Fallback to localStorage if API fails
        try {
          const storedProjects = localStorage.getItem('projects');
          if (storedProjects) {
            const parsedProjects = JSON.parse(storedProjects);
            if (Array.isArray(parsedProjects)) {
              setProjects(parsedProjects);
              console.log('Using projects from localStorage');
            }
          }
        } catch (localStorageError) {
          console.error('Error using localStorage fallback:', localStorageError);
        }
      }
    };

    fetchProjects();
  }, []);

  const handleProjectSelect = (project: Project) => {
    setIsOpen(false);
    onSelect(project);
  };

  const handleCreateNew = () => {
    setError(null); // Clear any previous errors
    setShowConfigModal(true);
    setIsOpen(false);
  };

  const handleCreateProject = async (config: any) => {
    try {
      setIsCreating(true);
      setError(null); // Clear any previous errors

      // Validate project name
      if (!config.name || config.name.trim() === '') {
        throw new Error('Project name is required');
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const { project } = await response.json();
      
      // Format the project path to ensure it starts with /project/
      const formattedProject = {
        ...project,
        path: project.path.startsWith('/project/') ? project.path : `/project/${project.path}`
      };
      
      // Update projects list
      setProjects([formattedProject, ...projects]);
      
      // Select the new project
      onSelect(formattedProject);
      
      // Refresh the file system to show new project files
      if (onConfigureProject) {
        await onConfigureProject();
      }
    } catch (error: any) {
      console.error('Error creating project:', error);
      setError(error.message || 'Failed to create project');
      // Keep the modal open when there's an error
      return;
    } finally {
      setIsCreating(false);
    }
    
    // Close the modal only if successful
    setShowConfigModal(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={
          navbarMode 
            ? "flex items-center gap-1 text-sm font-medium text-gray-300 hover:text-white ml-1 pl-1" 
            : "flex items-center gap-2 px-3 py-2 text-sm bg-[#1D1D1D] rounded-md text-gray-200 hover:bg-[#2D2D2D]"
        }
      >
        {!navbarMode && <FolderOpen className="h-4 w-4" />}
        <span className={navbarMode ? "truncate max-w-[150px]" : ""}>{currentProject?.name || 'Select Project'}</span>
        <ChevronDown className="h-3 w-3 ml-1 opacity-80" />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 mt-1 w-64 bg-[#1D1D1D] rounded-md shadow-lg z-50`}>
          <div className="p-2 border-b border-[#2D2D2D]">
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-200 hover:bg-[#2D2D2D] rounded-md"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Project</span>
            </button>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => handleProjectSelect(project)}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-[#2D2D2D] ${
                  currentProject?.id === project.id ? 'bg-[#2D2D2D] text-white' : 'text-gray-200'
                }`}
              >
                <FolderOpen className="h-4 w-4" />
                <span>{project.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {showConfigModal && (
        <ProjectConfigModal
          project={{ name: '', config: { description: '', type: 'web', language: 'typescript' } }}
          onClose={() => {
            setShowConfigModal(false);
            setError(null); // Clear any errors on close
          }}
          onSave={(newProject) => {
            handleCreateProject(newProject);
          }}
          isLoading={isCreating}
          error={error}
        />
      )}
    </div>
  );
}