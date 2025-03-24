import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Define virtual projects directory (same as in terminal route)
const PROJECT_ROOT = path.join(process.cwd(), 'virtual_projects');

// Define file types to exclude
const EXCLUDE_FILES = [
  'node_modules',
  '.git',
  '.next',
  '.env',
  '.env.local',
];

// Interface for file system objects
interface FileSystemItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  expanded?: boolean;
  children?: FileSystemItem[];
  content?: string;
}

// Get or initialize the user's project directory
const getUserProjectDir = async (userId: string): Promise<string> => {
  const userProjectDir = path.join(PROJECT_ROOT, userId || 'default_user');
  
  try {
    // Check if directory exists, create if not
    try {
      await fs.access(userProjectDir);
    } catch {
      await fs.mkdir(userProjectDir, { recursive: true });
      
      // Initialize with basic files
      await fs.writeFile(
        path.join(userProjectDir, 'README.md'), 
        '# Virtual Project\n\nThis is your isolated project environment. You can create and modify files safely within this directory.'
      );
    }
    
    return userProjectDir;
  } catch (error) {
    console.error('Error initializing user environment:', error);
    return PROJECT_ROOT;
  }
};

// Helper function to get file system items recursively
async function getFileSystemItems(
  directory: string, 
  relativePath: string = '', 
  maxDepth: number = 2,
  currentDepth: number = 0,
  baseDir: string
): Promise<FileSystemItem[]> {
  try {
    const items: FileSystemItem[] = [];
    const entries = await fs.readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      // Skip excluded files
      if (EXCLUDE_FILES.includes(entry.name)) {
        continue;
      }
      
      const entryPath = path.join(directory, entry.name);
      const itemRelativePath = path.join('/', relativePath, entry.name);
      
      if (entry.isDirectory()) {
        const item: FileSystemItem = {
          name: entry.name,
          type: 'directory',
          path: itemRelativePath,
          expanded: currentDepth < 1, // Auto-expand first level
        };
        
        // Recursively get children if not at max depth
        if (currentDepth < maxDepth) {
          item.children = await getFileSystemItems(
            entryPath, 
            path.join(relativePath, entry.name), 
            maxDepth, 
            currentDepth + 1,
            baseDir
          );
        } else {
          item.children = [];
        }
        
        items.push(item);
      } else {
        // It's a file
        let content = undefined;
        
        // For small text files, pre-load the content
        if (path.extname(entry.name).match(/\.(md|txt|json|js|ts|tsx|jsx|html|css|scss)$/)) {
          try {
            const stats = await fs.stat(entryPath);
            if (stats.size < 50000) { // Only load files smaller than 50KB
              content = await fs.readFile(entryPath, 'utf-8');
            }
          } catch (error) {
            console.error(`Error reading file ${entryPath}:`, error);
          }
        }
        
        items.push({
          name: entry.name,
          type: 'file',
          path: itemRelativePath,
          content
        });
      }
    }
    
    // Sort: directories first, then files, both alphabetically
    return items.sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get user ID and requested directory from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const requestedPath = searchParams.get('path') || '/';
    
    // Get user's project directory
    const userProjectDir = await getUserProjectDir(userId);
    
    // Resolve the requested path within the user's project directory
    let targetDir = userProjectDir;
    let targetFile = null;
    
    if (requestedPath && requestedPath !== '/') {
      // Remove leading /project/ from the path if it exists
      const cleanPath = requestedPath.replace(/^\/project\//, '');
      const resolvedPath = path.resolve(userProjectDir, cleanPath);
      
      // Security check - make sure the path is within the user's project directory
      if (resolvedPath.startsWith(userProjectDir)) {
        try {
          const stats = await fs.stat(resolvedPath);
          if (stats.isDirectory()) {
            targetDir = resolvedPath;
          } else if (stats.isFile()) {
            // If it's a file, read its content
            const content = await fs.readFile(resolvedPath, 'utf-8');
            targetFile = {
              name: path.basename(resolvedPath),
              type: 'file',
              path: requestedPath,
              content
            };
          }
        } catch (error) {
          // If path doesn't exist, fall back to user project root
          console.error(`Requested path not found: ${resolvedPath}`);
        }
      } else {
        // Path is outside user's project directory, this is a security issue
        console.warn(`Security warning: Attempted to access path outside user directory: ${resolvedPath}`);
      }
    }
    
    // If we're looking for a specific file, return just that file
    if (targetFile) {
      return NextResponse.json({ file: targetFile });
    }
    
    // Otherwise, get file system structure
    const fileSystem = await getFileSystemItems(targetDir, '', 2, 0, userProjectDir);
    
    return NextResponse.json({ 
      fileSystem,
      baseDir: path.relative(userProjectDir, targetDir) || '/'
    });
  } catch (error) {
    console.error('Error fetching file system:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch file system',
      fileSystem: []
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get user ID and requested path from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const requestedPath = searchParams.get('path') || '/';
    
    // Get user's project directory
    const userProjectDir = await getUserProjectDir(userId);
    
    // Remove leading /project/ from the path if it exists
    const cleanPath = requestedPath.replace(/^\/project\//, '');
    const resolvedPath = path.resolve(userProjectDir, cleanPath);
    
    // Security check - make sure the path is within the user's project directory
    if (!resolvedPath.startsWith(userProjectDir)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 403 });
    }
    
    // Get the file content from the request body
    const { content } = await request.json();
    
    // Write the content to the file
    await fs.writeFile(resolvedPath, content, 'utf-8');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
  }
} 