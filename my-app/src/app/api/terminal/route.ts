import { NextRequest, NextResponse } from 'next/server';
import { exec, ExecOptions, ExecException } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { syncFile } from '@/lib/file-sync';

// Create isolated project directories for each user session
const PROJECT_ROOT = path.join(process.cwd(), 'virtual_projects');

// Ensure the virtual projects directory exists
try {
  if (!fs.access(PROJECT_ROOT)) {
    fs.mkdir(PROJECT_ROOT, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create virtual projects directory:', error);
}

// Define safe commands (optional, can be expanded based on requirements)
const isSafeCommand = (command: string): boolean => {
  // This is a basic implementation. In production, you would want more robust checking.
  const blockedCommands = [
    'rm -rf /', 
    'sudo', 
    '>>', 
    '>', 
    '||',
    ';',
    'chmod 777',
    '$(', 
    '`',
    'eval'
  ];
  
  return !blockedCommands.some(blocked => command.includes(blocked));
};

// Initialize or get user's virtual environment
const initializeUserEnvironment = async (userId: string): Promise<string> => {
  const userProjectDir = path.join(PROJECT_ROOT, userId);
  
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
    throw error;
  }
};

// Ensure working directory is within user's project path
const validateWorkingDirectory = async (workingDir: string, userProjectDir: string): Promise<string> => {
  // Normalize paths
  const normalizedWorkingDir = path.normalize(workingDir);
  const normalizedProjectDir = path.normalize(userProjectDir);
  
  // If the working directory is within the user's project directory, allow it
  if (normalizedWorkingDir.startsWith(normalizedProjectDir)) {
    try {
      await fs.access(normalizedWorkingDir);
      return normalizedWorkingDir;
    } catch {
      // If directory doesn't exist, default to user's project root
      return normalizedProjectDir;
    }
  }
  
  // Default to user's project root if working directory is outside allowed area
  return normalizedProjectDir;
};

// Get file and directory completions for tab completion
async function getCompletions(prefix: string, workingDir: string, command?: string): Promise<string[]> {
  try {
    console.log('Getting completions for prefix:', prefix, 'in directory:', workingDir, 'command:', command);
    
    // Command-specific completions
    if (command && command.trim()) {
      // If we're completing a vim/nano/emacs command, prioritize file completions
      if (['vim', 'nano', 'emacs', 'cat', 'less', 'more'].includes(command.trim())) {
        return getFileCompletions(prefix, workingDir);
      }
      
      // If we're completing a cd command, only show directories
      if (command.trim() === 'cd') {
        return getDirectoryCompletions(prefix, workingDir);
      }
    }
    
    // Default to standard file/directory completions
    return getFileCompletions(prefix, workingDir);
  } catch (error) {
    console.error('Error getting completions:', error);
    return [];
  }
}

// Get completions for files and directories
async function getFileCompletions(prefix: string, workingDir: string): Promise<string[]> {
  try {
    // If prefix is empty, list all files in current directory
    if (!prefix) {
      const files = await fs.readdir(workingDir, { withFileTypes: true });
      return files.map(dirent => {
        return dirent.name + (dirent.isDirectory() ? '/' : '');
      });
    }
    
    // Check if the prefix has a directory part
    const lastSlashIndex = prefix.lastIndexOf('/');
    let dirPath = workingDir;
    let filePrefix = prefix;
    
    if (lastSlashIndex >= 0) {
      // If there's a slash, we need to check in that directory
      const dirPart = prefix.substring(0, lastSlashIndex);
      filePrefix = prefix.substring(lastSlashIndex + 1);
      
      // If it's an absolute path, use it directly, otherwise resolve it relative to workingDir
      if (dirPart.startsWith('/')) {
        dirPath = dirPart;
      } else {
        dirPath = path.resolve(workingDir, dirPart);
      }
      
      console.log('Directory part:', dirPath, 'File prefix:', filePrefix);
    }
    
    // Handle special cases like ~ for home
    if (dirPath.startsWith('~')) {
      dirPath = dirPath.replace(/^~/, os.homedir());
    }
    
    // Make sure the directory exists before reading its contents
    try {
      await fs.access(dirPath);
    } catch (error) {
      console.error('Directory does not exist:', dirPath);
      return [];
    }
    
    // Read the directory contents
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    console.log('Found files:', files.map(f => f.name).join(', '));
    
    // Filter by the prefix and map to names
    return files
      .filter(dirent => dirent.name.toLowerCase().startsWith(filePrefix.toLowerCase()))
      .map(dirent => {
        const baseName = dirent.name;
        // For directories, add a trailing slash
        const suffix = dirent.isDirectory() ? '/' : '';
        
        // If we had a directory part in the prefix, add it back
        if (lastSlashIndex >= 0) {
          return prefix.substring(0, lastSlashIndex + 1) + baseName + suffix;
        }
        
        return baseName + suffix;
      });
  } catch (error) {
    console.error('Error getting file completions:', error);
    return [];
  }
}

// Get completions for directories only
async function getDirectoryCompletions(prefix: string, workingDir: string): Promise<string[]> {
  try {
    const allCompletions = await getFileCompletions(prefix, workingDir);
    // Filter to only include directories (entries ending with /)
    return allCompletions.filter(name => name.endsWith('/'));
  } catch (error) {
    console.error('Error getting directory completions:', error);
    return [];
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json();
    const { command, workingDirectory, userId = 'default_user', tabCompletion } = body;
    
    // Handle tab completion request
    if (tabCompletion !== undefined) {
      console.log('Tab completion request received for:', tabCompletion);
      
      // Initialize user's virtual environment
      const userProjectDir = await initializeUserEnvironment(userId);
      
      // Validate and normalize working directory
      const validatedDir = await validateWorkingDirectory(
        workingDirectory || userProjectDir, 
        userProjectDir
      );
      
      // Get completions based on the current command input
      const completions = await getCompletions(tabCompletion, validatedDir, body.command);
      console.log('Completions found:', completions);
      
      return NextResponse.json({
        completions
      });
    }
    
    if (!command) {
      return NextResponse.json({
        error: 'No command provided',
        exitCode: 1
      }, { status: 400 });
    }
    
    // Security checks
    if (!isSafeCommand(command)) {
      return NextResponse.json({
        error: 'Command not allowed for security reasons',
        exitCode: 1
      }, { status: 403 });
    }
    
    // Initialize user's virtual environment
    const userProjectDir = await initializeUserEnvironment(userId);
    
    // Validate and normalize working directory
    const validatedDir = await validateWorkingDirectory(
      workingDirectory || userProjectDir, 
      userProjectDir
    );
    
    // Track if file system changes
    let fileSystemChanged = false;
    
    // Track if we need to update working directory
    let newWorkingDirectory = validatedDir;
    
    // Check if command is changing directory
    if (command.trim().startsWith('cd ')) {
      const targetDir = command.trim().substring(3).trim();
      
      if (!targetDir) {
        // cd without args goes to user's project root
        newWorkingDirectory = userProjectDir;
      } else {
        // Calculate new directory
        const resolvedPath = path.resolve(validatedDir, targetDir);
        
        try {
          // Check if directory exists and is within allowed area
          await fs.access(resolvedPath);
          newWorkingDirectory = await validateWorkingDirectory(resolvedPath, userProjectDir);
          
          return NextResponse.json({
            output: `Changed directory to ${path.relative(userProjectDir, newWorkingDirectory) || '/'}`,
            newWorkingDirectory,
            fileSystemChanged: false,
            exitCode: 0
          });
        } catch (error) {
          return NextResponse.json({
            error: `cd: ${targetDir}: No such file or directory`,
            newWorkingDirectory: validatedDir,
            fileSystemChanged: false,
            exitCode: 1
          });
        }
      }
    }
    
    // Commands that potentially change file system
    const fileSystemCommands = ['mkdir', 'touch', 'rm', 'mv', 'cp', 'git', 'npm', 'yarn', 'npx', 'cat >', 'echo >', 'nano', 'vi'];
    if (fileSystemCommands.some(cmd => command.includes(cmd))) {
      fileSystemChanged = true;
    }
    
    // Handle special 'sync' command for file synchronization
    if (command.startsWith('sync ')) {
      const filePath = command.substring(5).trim();
      if (!filePath) {
        return NextResponse.json({
          output: 'Error: Please specify a file to sync.',
          error: 'No file specified',
          exitCode: 1
        });
      }
      
      try {
        // Normalize the path
        const normalizedPath = filePath.startsWith('/project/') 
          ? filePath 
          : path.join('/project', filePath);
          
        // Read file content first
        const fileContent = await fs.readFile(path.join(validatedDir, filePath), 'utf-8');
        
        // Use syncFile utility
        const success = await syncFile(userId, normalizedPath, fileContent);
        
        if (!success) {
          return NextResponse.json({
            output: 'Error: Failed to sync file.',
            error: 'Sync failed',
            exitCode: 1
          });
        }
        
        return NextResponse.json({
          output: 'File synchronized successfully',
          exitCode: 0,
          fileSystemChanged: true
        });
      } catch (error) {
        return NextResponse.json({
          output: `Error synchronizing file: ${error instanceof Error ? error.message : String(error)}`,
          error: String(error),
          exitCode: 1
        });
      }
    }
    
    // Prepare environment for command execution
    const execOptions: ExecOptions = {
      cwd: validatedDir,
      // Limit environment variables - using partial env variables
      env: Object.assign({}, process.env, {
        HOME: userProjectDir,
        USER: 'virtual_user',
        TEMP: path.join(userProjectDir, 'tmp'),
        TMPDIR: path.join(userProjectDir, 'tmp'),
      }),
      // Set time limits
      timeout: 10000, // 10 seconds timeout
      maxBuffer: 1024 * 1024, // 1MB output limit
    };
    
    // Execute the command
    return new Promise<Response>((resolve) => {
      exec(command, execOptions, (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          resolve(NextResponse.json({
            output: stderr || 'Command failed',
            error: stderr,
            exitCode: error.code || 1,
            newWorkingDirectory,
            fileSystemChanged,
            virtualPath: path.relative(userProjectDir, newWorkingDirectory) || '/'
          }));
          return;
        }
        
        resolve(NextResponse.json({
          output: stdout,
          exitCode: 0,
          newWorkingDirectory,
          fileSystemChanged,
          virtualPath: path.relative(userProjectDir, newWorkingDirectory) || '/'
        }));
      });
    });
    
  } catch (error) {
    console.error('Error processing terminal command:', error);
    return NextResponse.json({
      error: 'Server error processing command',
      exitCode: 1
    }, { status: 500 });
  }
} 