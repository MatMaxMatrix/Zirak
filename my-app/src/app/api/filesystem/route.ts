import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { syncFile, findFile, deleteFile } from '@/lib/file-sync';
import fsSync from 'fs';

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
  location?: string;
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
      // Normalize the path: Remove leading /project/ and any duplicate slashes
      const cleanPath = requestedPath
        .replace(/^\/project\//, '')
        .replace(/\/+/g, '/') // Replace multiple slashes with single slash
        .replace(/^\/*/, ''); // Ensure no leading slash to avoid resolving to root
      
      console.log('Cleaned path:', cleanPath);
      
      const resolvedPath = path.resolve(userProjectDir, cleanPath);
      console.log('Resolved path:', resolvedPath, 'User project dir:', userProjectDir);
      
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
          // If path doesn't exist in the hierarchy, check if it exists in the CWD
          try {
            const filename = path.basename(cleanPath);
            const cwdPath = path.join(userProjectDir, filename);
            
            console.log(`Checking alternate CWD path: ${cwdPath}`);
            
            const cwdStats = await fs.stat(cwdPath);
            if (cwdStats.isFile()) {
              // File exists in CWD, read its content
              const content = await fs.readFile(cwdPath, 'utf-8');
              
              // If found in CWD but not in hierarchy, synchronize the files
              try {
                // Ensure the directory exists in the hierarchy
                const dirPath = path.dirname(resolvedPath);
                await fs.mkdir(dirPath, { recursive: true });
                
                // Copy the file from CWD to the hierarchy
                await fs.writeFile(resolvedPath, content, 'utf-8');
                console.log(`File synchronized from CWD to hierarchy: ${resolvedPath}`);
              } catch (syncError) {
                console.warn(`Failed to synchronize file from CWD to hierarchy: ${syncError}`);
                // Continue even if sync fails
              }
              
              targetFile = {
                name: filename,
                type: 'file',
                path: requestedPath,
                content,
                location: 'cwd' // Indicate this was found in CWD
              };
            } else {
              throw new Error('Not a file');
            }
          } catch (cwdError) {
            // If path doesn't exist, return specific error
            console.error(`Requested path not found: ${resolvedPath}`, error);
            console.error(`Also checked CWD path but not found: ${cwdError}`);
            
            return NextResponse.json({ 
              error: `File not found: ${requestedPath}`,
              details: `The file "${path.basename(resolvedPath)}" does not exist or cannot be accessed.`,
              path: cleanPath,
              resolvedPath: resolvedPath
            }, { 
              status: 404,
              headers: {
                'Cache-Control': 'no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
          }
        }
      } else {
        // Path is outside user's project directory, this is a security issue
        console.warn(`Security warning: Attempted to access path outside user directory: ${resolvedPath}`);
        return NextResponse.json({ 
          error: 'Access denied',
          details: 'The requested path is outside the permitted directory.',
          path: cleanPath,
          resolvedPath: resolvedPath,
          userProjectDir: userProjectDir
        }, { 
          status: 403,
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }
    }
    
    // If we're looking for a specific file, return just that file
    if (targetFile) {
      return NextResponse.json({ file: targetFile }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    // Otherwise, get file system structure
    const fileSystem = await getFileSystemItems(targetDir, '', 2, 0, userProjectDir);
    
    return NextResponse.json({ 
      fileSystem,
      baseDir: path.relative(userProjectDir, targetDir) || '/'
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error fetching file system:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch file system',
      fileSystem: []
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get user ID from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    
    // Get request body
    const { path: filePath, content } = await request.json();
    
    // Normalize the path: remove leading /project/ if present
    const cleanPath = filePath
      .replace(/^\/project\//, '')
      .replace(/\/+/g, '/') // Replace multiple slashes with single slash
      .replace(/^\/*/, ''); // Ensure no leading slash
    
    console.log('Clean path for file writing:', cleanPath);
    
    // Get user's project directory
    const userProjectDir = await getUserProjectDir(userId);
    
    // Create both paths - one for the hierarchical location and one for root
    const hierarchyPath = path.resolve(userProjectDir, cleanPath);
    const rootPath = path.join(userProjectDir, path.basename(cleanPath));
    
    console.log('Writing to paths:', { hierarchyPath, rootPath });
    
    // Use our enhanced syncFile function to ensure the file is written everywhere
    const success = await syncFile(userId, filePath, content);
    
    if (!success) {
      throw new Error('Failed to sync file to all locations');
    }
    
    // Return success with detailed paths information
    return NextResponse.json({ 
      success: true, 
      path: filePath,
      realPath: hierarchyPath,
      cwdPath: rootPath,
      normalized: `/project/${cleanPath}`
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error writing file:', error);
    return NextResponse.json({ 
      error: 'Failed to write file',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get user ID and requested path from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const requestedPath = searchParams.get('path');
    
    if (!requestedPath) {
      return NextResponse.json({ 
        error: 'Path parameter is required',
        details: 'Missing path parameter'
      }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
    
    // Use our delete utility to remove from both locations
    const result = await deleteFile(userId, requestedPath);
    
    if (result.success) {
      return NextResponse.json({ 
        success: true,
        deleted: result.deleted
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } else {
      // File might already be gone, but we'll return 200 to avoid UI sync issues
      return NextResponse.json({ 
        success: true,
        warning: 'File may have already been deleted',
        deleted: result.deleted
      }, {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ 
      error: 'Failed to delete file',
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

// Add HEAD method to check for file existence
export async function HEAD(request: NextRequest) {
  try {
    // Get user ID and requested path from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const requestedPath = searchParams.get('path') || '/';
    
    // Use our find utility to check in both locations
    const fileInfo = await findFile(userId, requestedPath);
    
    if (fileInfo.exists && fileInfo.path) {
      const stats = await fs.stat(fileInfo.path);
      
      // Create headers object explicitly with type safety
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-File-Type': stats.isDirectory() ? 'directory' : 'file',
        'X-File-Path': fileInfo.path,
        'X-File-Size': stats.size.toString()
      };
      
      // Only add location if it exists
      if (fileInfo.location) {
        headers['X-File-Location'] = fileInfo.location;
      }
      
      // Return 200 with appropriate headers for file/directory type
      return new NextResponse(null, {
        status: 200,
        headers
      });
    } else {
      // File doesn't exist in either location
      return new NextResponse(null, {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
  } catch (error) {
    console.error('Error checking file existence:', error);
    return new NextResponse(null, {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
} 