import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

// Define interactive commands we support
const isInteractiveCommand = (command: string): boolean => {
  // Extract the base command (e.g., "vim file.txt" -> "vim")
  const baseCommand = command.trim().split(' ')[0];
  
  // List of supported interactive commands
  const supportedCommands = [
    'vim',
    'vi',
    'nano',
    'emacs',
    'top',
    'less',
    'more'
  ];
  
  return supportedCommands.includes(baseCommand);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command, workingDirectory, userId = 'default_user' } = body;
    
    if (!command) {
      return NextResponse.json({
        error: 'No command provided',
        exitCode: 1
      }, { status: 400 });
    }
    
    // Check if command is supported for interactive execution
    if (!isInteractiveCommand(command)) {
      return NextResponse.json({
        error: 'Command not supported in interactive mode',
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
    
    // Create a unique session ID for this interactive session
    const sessionId = uuidv4();
    
    try {
      // For Vim and other editors, we'll simulate their behavior
      // In a real implementation, you might use WebSockets for true interactive terminal
      const baseCommand = command.trim().split(' ')[0];
      const args = command.trim().split(' ').slice(1);
      
      if (baseCommand === 'vim' || baseCommand === 'vi') {
        const filePath = args[0];
        if (!filePath) {
          return NextResponse.json({
            error: 'No file specified for vim',
            exitCode: 1
          });
        }
        
        // Resolve the file path
        const fullFilePath = path.resolve(validatedDir, filePath);
        
        // Ensure the file path is within the user's project directory
        if (!fullFilePath.startsWith(userProjectDir)) {
          return NextResponse.json({
            error: 'Cannot access files outside your project directory',
            exitCode: 1
          });
        }
        
        // Check if the request includes content to write to the file
        if (body.fileContent !== undefined) {
          // This is a save operation from a previous vim session
          try {
            await fs.writeFile(fullFilePath, body.fileContent);
            return NextResponse.json({
              output: `File saved: ${filePath}`,
              fileSystemChanged: true,
              exitCode: 0
            });
          } catch (error) {
            return NextResponse.json({
              error: `Failed to save file: ${error instanceof Error ? error.message : String(error)}`,
              exitCode: 1
            });
          }
        }
        
        try {
          // Check if file exists
          await fs.access(fullFilePath);
          
          // Read file content to edit
          const content = await fs.readFile(fullFilePath, 'utf8');
          
          return NextResponse.json({
            output: `VIM SIMULATION:\n\nEditing file: ${filePath}\n\n${content}`,
            fileContent: content,
            filePath: fullFilePath,
            editable: true,
            fileSystemChanged: false,
            exitCode: 0
          });
        } catch (error) {
          // If file doesn't exist, create it
          await fs.writeFile(fullFilePath, '');
          
          return NextResponse.json({
            output: `VIM SIMULATION:\n\nNew file: ${filePath}`,
            fileContent: '',
            filePath: fullFilePath,
            editable: true,
            fileSystemChanged: true,
            exitCode: 0
          });
        }
      } else if (baseCommand === 'nano') {
        const filePath = args[0];
        if (!filePath) {
          return NextResponse.json({
            error: 'No file specified for nano',
            exitCode: 1
          });
        }
        
        // Resolve the file path
        const fullFilePath = path.resolve(validatedDir, filePath);
        
        // Ensure the file path is within the user's project directory
        if (!fullFilePath.startsWith(userProjectDir)) {
          return NextResponse.json({
            error: 'Cannot access files outside your project directory',
            exitCode: 1
          });
        }
        
        // Check if the request includes content to write to the file
        if (body.fileContent !== undefined) {
          // This is a save operation from a previous nano session
          try {
            await fs.writeFile(fullFilePath, body.fileContent);
            return NextResponse.json({
              output: `File saved: ${filePath}`,
              fileSystemChanged: true,
              exitCode: 0
            });
          } catch (error) {
            return NextResponse.json({
              error: `Failed to save file: ${error instanceof Error ? error.message : String(error)}`,
              exitCode: 1
            });
          }
        }
        
        try {
          // Check if file exists
          await fs.access(fullFilePath);
          
          // Read file content
          const content = await fs.readFile(fullFilePath, 'utf8');
          
          return NextResponse.json({
            output: `NANO SIMULATION:\n\nEditing file: ${filePath}\n\n${content}`,
            fileContent: content,
            filePath: fullFilePath,
            editable: true,
            fileSystemChanged: false,
            exitCode: 0
          });
        } catch (error) {
          // If file doesn't exist, create it
          await fs.writeFile(fullFilePath, '');
          
          return NextResponse.json({
            output: `NANO SIMULATION:\n\nNew file: ${filePath}`,
            fileContent: '',
            filePath: fullFilePath,
            editable: true,
            fileSystemChanged: true,
            exitCode: 0
          });
        }
      } else if (baseCommand === 'top') {
        // Simulate top command with some static output
        return NextResponse.json({
          output: `TOP SIMULATION:\n\nProcesses: 123 total, 5 running, 118 sleeping\nCPU: 12.3% user, 5.6% system, 82.1% idle\nPhys Mem: 8GB used, 8GB free\n\n  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n 1234 virtual+  20   0    2.0g   1.5g   1.2g S   8.0   9.3   10:30.12 node\n 1235 virtual+  20   0    1.5g   1.0g   0.8g S   7.5   6.2    8:15.54 npm\n 1236 virtual+  20   0    0.5g   0.3g   0.2g S   4.2   1.9    5:10.23 bash\n\n(Note: This is a simulated top output. Real system monitoring is not available.)`,
          fileSystemChanged: false,
          exitCode: 0
        });
      } else {
        return NextResponse.json({
          output: `The interactive command '${baseCommand}' is recognized but not fully supported in this environment.\n\nPlease use standard non-interactive commands instead.`,
          fileSystemChanged: false,
          exitCode: 0
        });
      }
    } catch (error) {
      console.error('Error handling interactive command:', error);
      return NextResponse.json({
        error: 'Error handling interactive command',
        exitCode: 1
      });
    }
  } catch (error) {
    console.error('Error processing interactive terminal command:', error);
    return NextResponse.json({
      error: 'Server error processing command',
      exitCode: 1
    }, { status: 500 });
  }
} 