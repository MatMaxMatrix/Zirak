import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PROJECTS_DIR = path.join(process.cwd(), 'projects');

// Ensure projects directory exists
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

// Function to create project structure based on type and framework
function createProjectStructure(projectPath: string, config: any) {
  const { type, language, framework } = config;

  // Create basic project structure
  fs.mkdirSync(projectPath, { recursive: true });

  // Create project configuration file
  fs.writeFileSync(
    path.join(projectPath, 'project.json'),
    JSON.stringify(config, null, 2)
  );

  // Create README.md
  fs.writeFileSync(
    path.join(projectPath, 'README.md'),
    `# ${config.name}\n\n${config.description}\n\n## Project Configuration\n- Type: ${type}\n- Language: ${language}\n${framework ? `- Framework: ${framework}\n` : ''}`
  );

  // Create project structure based on type and framework
  switch (type) {
    case 'web':
      if (framework === 'next') {
        // Create Next.js project structure
        fs.mkdirSync(path.join(projectPath, 'src'));
        fs.mkdirSync(path.join(projectPath, 'src/app'));
        fs.mkdirSync(path.join(projectPath, 'src/components'));
        fs.mkdirSync(path.join(projectPath, 'public'));
        
        // Create basic Next.js files
        fs.writeFileSync(
          path.join(projectPath, 'src/app/page.tsx'),
          `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1>Welcome to ${config.name}</h1>
    </main>
  );
}`
        );
        
        fs.writeFileSync(
          path.join(projectPath, 'src/app/layout.tsx'),
          `export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}`
        );
      } else if (framework === 'react') {
        // Create React project structure
        fs.mkdirSync(path.join(projectPath, 'src'));
        fs.mkdirSync(path.join(projectPath, 'public'));
        
        // Create basic React files
        fs.writeFileSync(
          path.join(projectPath, 'src/App.tsx'),
          `import React from 'react';

function App() {
  return (
    <div>
      <h1>Welcome to ${config.name}</h1>
    </div>
  );
}

export default App;`
        );
      }
      break;

    case 'mobile':
      // Create mobile project structure
      fs.mkdirSync(path.join(projectPath, 'src'));
      fs.mkdirSync(path.join(projectPath, 'assets'));
      break;

    case 'desktop':
      // Create desktop project structure
      fs.mkdirSync(path.join(projectPath, 'src'));
      fs.mkdirSync(path.join(projectPath, 'resources'));
      break;

    default:
      // Create basic structure for other types
      fs.mkdirSync(path.join(projectPath, 'src'));
      fs.mkdirSync(path.join(projectPath, 'docs'));
  }

  // Create .gitignore
  fs.writeFileSync(
    path.join(projectPath, '.gitignore'),
    `# Dependencies
node_modules/
.pnp/
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*`
  );
}

export async function GET() {
  try {
    // Read all project directories
    const projects = fs.readdirSync(PROJECTS_DIR)
      .filter(file => fs.statSync(path.join(PROJECTS_DIR, file)).isDirectory())
      .map(projectDir => {
        const projectPath = path.join(PROJECTS_DIR, projectDir);
        const stats = fs.statSync(projectPath);
        
        // Read project configuration if exists
        let config = {};
        try {
          const configPath = path.join(projectPath, 'project.json');
          if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          }
        } catch (error) {
          console.error(`Error reading config for project ${projectDir}:`, error);
        }

        return {
          id: projectDir,
          name: projectDir,
          path: projectPath,
          lastAccessed: stats.mtime.toISOString(),
          config,
        };
      })
      .sort((a, b) => new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime());

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const config = await request.json();
    
    if (!config.name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const projectPath = path.join(PROJECTS_DIR, config.name);
    
    if (fs.existsSync(projectPath)) {
      return NextResponse.json({ error: 'Project already exists' }, { status: 409 });
    }

    // Create project structure
    createProjectStructure(projectPath, config);

    const project = {
      id: config.name,
      name: config.name,
      path: projectPath,
      lastAccessed: new Date().toISOString(),
      config,
    };

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
} 