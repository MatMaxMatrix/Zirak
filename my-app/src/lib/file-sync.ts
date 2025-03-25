import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';
import fsSync from 'fs';

// Convert exec to Promise-based
const execAsync = util.promisify(exec);

// Define virtual projects directory (same as in route files)
const PROJECT_ROOT = path.join(process.cwd(), 'virtual_projects');

// Get the user's project directory path
export const getUserProjectDir = async (userId: string): Promise<string> => {
  const userProjectDir = path.join(PROJECT_ROOT, userId || 'default_user');
  
  try {
    // Check if directory exists, create if not
    try {
      await fs.access(userProjectDir);
    } catch {
      await fs.mkdir(userProjectDir, { recursive: true });
    }
    
    return userProjectDir;
  } catch (error) {
    console.error('Error accessing user environment:', error);
    return PROJECT_ROOT;
  }
};

// Perform a thorough synchronization of a file across all potential locations
export const syncFile = async (userId: string, filePath: string, content: string): Promise<boolean> => {
  try {
    // Get user's project directory
    const userProjectDir = await getUserProjectDir(userId);
    
    // Normalize the path
    const cleanPath = filePath
      .replace(/^\/project\//, '')
      .replace(/\/+/g, '/') 
      .replace(/^\/*/, '');
    
    console.log('Syncing file:', cleanPath);
    
    // Create paths for all possible locations
    const hierarchyPath = path.resolve(userProjectDir, cleanPath);
    const rootPath = path.join(userProjectDir, path.basename(cleanPath));
    
    // Make sure parent directories exist
    await fs.mkdir(path.dirname(hierarchyPath), { recursive: true });
    
    // Write to both primary locations
    await fs.writeFile(hierarchyPath, content, { encoding: 'utf-8' });
    await fs.writeFile(rootPath, content, { encoding: 'utf-8' });
    
    // Force sync to disk
    try {
      const fd1 = fsSync.openSync(hierarchyPath, 'r+');
      fsSync.fsyncSync(fd1);
      fsSync.closeSync(fd1);
      
      const fd2 = fsSync.openSync(rootPath, 'r+');
      fsSync.fsyncSync(fd2);
      fsSync.closeSync(fd2);
    } catch (err) {
      console.warn('Error during file sync operations:', err);
    }
    
    // Write to intermediate directories if needed
    if (cleanPath.includes('/')) {
      const pathParts = cleanPath.split('/');
      const filename = pathParts[pathParts.length - 1];
      
      // For each level of directory, ensure file is also copied there
      for (let i = 0; i < pathParts.length - 1; i++) {
        const partPath = pathParts.slice(0, i + 1).join('/');
        const partialDirPath = path.join(userProjectDir, partPath);
        const fileDuplicate = path.join(partialDirPath, filename);
        
        try {
          await fs.mkdir(partialDirPath, { recursive: true });
          await fs.writeFile(fileDuplicate, content, { encoding: 'utf-8' });
          
          // Force sync
          const fd = fsSync.openSync(fileDuplicate, 'r+');
          fsSync.fsyncSync(fd);
          fsSync.closeSync(fd);
        } catch (err) {
          console.warn(`Error writing duplicate to ${fileDuplicate}:`, err);
        }
      }
    }
    
    // Use system commands for additional robustness
    try {
      // Run cp commands to ensure the file exists everywhere it should
      const cmds = [
        `cp "${hierarchyPath}" "${userProjectDir}"`, // Copy to root dir
      ];
      
      // Add command to copy to parent dirs if needed
      if (cleanPath.includes('/')) {
        const dirPath = path.dirname(hierarchyPath);
        cmds.push(`cp "${hierarchyPath}" "${dirPath}"`);
      }
      
      // Execute all commands in parallel
      await Promise.all(cmds.map(cmd => execAsync(cmd).catch(e => 
        console.warn(`Command failed: ${cmd} - ${e.message}`)
      )));
      
      // Use touch to update timestamp (helps with cache invalidation)
      await execAsync(`touch "${hierarchyPath}"`).catch(e => console.warn(`Touch failed: ${e.message}`));
      await execAsync(`touch "${rootPath}"`).catch(e => console.warn(`Touch failed: ${e.message}`));
    } catch (err) {
      console.warn('Error during command execution:', err);
    }
    
    return true;
  } catch (error) {
    console.error('Error during file sync:', error);
    return false;
  }
};

// Find a file in any of its possible locations
export const findFile = async (userId: string, filePath: string): Promise<{exists: boolean, path?: string, location?: string}> => {
  try {
    // Get user's project directory
    const userProjectDir = await getUserProjectDir(userId);
    
    // Normalize the path
    const cleanPath = filePath
      .replace(/^\/project\//, '')
      .replace(/\/+/g, '/') 
      .replace(/^\/*/, '');
    
    // Full path in hierarchy
    const hierarchyPath = path.resolve(userProjectDir, cleanPath);
    
    // Path in root directory (just the filename)
    const rootPath = path.join(userProjectDir, path.basename(cleanPath));
    
    // Check hierarchy path first
    try {
      await fs.access(hierarchyPath);
      return { exists: true, path: hierarchyPath, location: 'hierarchy' };
    } catch {
      // If not in hierarchy, check root
      try {
        await fs.access(rootPath);
        
        // If found in root but not in hierarchy, sync the file to hierarchy
        try {
          // Ensure directory exists
          await fs.mkdir(path.dirname(hierarchyPath), { recursive: true });
          
          // Copy content from root to hierarchy
          const content = await fs.readFile(rootPath, 'utf-8');
          await fs.writeFile(hierarchyPath, content, 'utf-8');
          
          console.log(`File synchronized from root to hierarchy: ${cleanPath}`);
        } catch (syncError) {
          console.warn(`Failed to sync from root to hierarchy: ${syncError}`);
        }
        
        return { exists: true, path: rootPath, location: 'root' };
      } catch {
        return { exists: false };
      }
    }
  } catch (error) {
    console.error('Error finding file:', error);
    return { exists: false };
  }
};

// Delete a file from all possible locations
export const deleteFile = async (userId: string, filePath: string): Promise<{success: boolean, deleted: string[]}> => {
  try {
    // Get user's project directory
    const userProjectDir = await getUserProjectDir(userId);
    
    // Normalize the path
    const cleanPath = filePath
      .replace(/^\/project\//, '')
      .replace(/\/+/g, '/') 
      .replace(/^\/*/, '');
    
    // Full path in hierarchy
    const hierarchyPath = path.resolve(userProjectDir, cleanPath);
    
    // Path in root directory (just the filename)
    const rootPath = path.join(userProjectDir, path.basename(cleanPath));
    
    const deletedPaths: string[] = [];
    
    // Delete from both locations
    try {
      await fs.unlink(hierarchyPath);
      deletedPaths.push(hierarchyPath);
    } catch (err: any) {
      console.warn(`Couldn't delete from hierarchy: ${err.message}`);
    }
    
    try {
      await fs.unlink(rootPath);
      deletedPaths.push(rootPath);
    } catch (err: any) {
      console.warn(`Couldn't delete from root: ${err.message}`);
    }
    
    // If this is a file in subdirectories, also check there
    if (cleanPath.includes('/')) {
      const pathParts = cleanPath.split('/');
      const filename = pathParts[pathParts.length - 1];
      
      // For each directory level, try to delete the file there too
      for (let i = 0; i < pathParts.length - 1; i++) {
        const partPath = pathParts.slice(0, i + 1).join('/');
        const subDirPath = path.join(userProjectDir, partPath);
        const fileDuplicate = path.join(subDirPath, filename);
        
        try {
          await fs.unlink(fileDuplicate);
          deletedPaths.push(fileDuplicate);
        } catch (err) {
          // Ignore errors for these duplicates
        }
      }
    }
    
    return { 
      success: deletedPaths.length > 0,
      deleted: deletedPaths
    };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, deleted: [] };
  }
}; 