import { useState, useEffect } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
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
}

export function ProjectSelector({ 
  currentProject, 
  onSelect, 
  onCreateProject, 
  onConfigureProject 
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Fetch projects from localStorage or API
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Failed to fetch projects');
        const data = await response.json();
        setProjects(data.projects);
      } catch (error) {
        console.error('Error fetching projects:', error);
        // Fallback to localStorage if API fails
        const storedProjects = localStorage.getItem('projects');
        if (storedProjects) {
          setProjects(JSON.parse(storedProjects));
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
    setShowConfigModal(true);
    setIsOpen(false);
  };

  const handleCreateProject = async (config: any) => {
    try {
      setIsCreating(true);
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
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
    } catch (error) {
      console.error('Error creating project:', error);
      // Handle error (show error message to user)
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-[#1D1D1D] rounded-md text-gray-200 hover:bg-[#2D2D2D]"
      >
        <FolderOpen className="h-4 w-4" />
        <span>{currentProject?.name || 'Select Project'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-[#1D1D1D] rounded-md shadow-lg z-50">
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
          onClose={() => setShowConfigModal(false)}
          onSave={(newProject) => {
            setShowConfigModal(false);
            handleCreateProject(newProject);
          }}
        />
      )}
    </div>
  );
} 