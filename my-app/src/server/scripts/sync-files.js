const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

// Define virtual projects directory
const PROJECT_ROOT = path.join(process.cwd(), 'virtual_projects');
// Define projects directory where files will be mirrored
const PROJECTS_DIR = path.join(process.cwd(), 'projects');

/**
 * Main function to synchronize all files for all users
 */
async function syncAllUserFiles() {
  try {
    console.log('Starting file system synchronization...');
    
    // Ensure projects directory exists
    await mkdirAsync(PROJECTS_DIR, { recursive: true }).catch(() => {});
    
    // Get all user directories
    const userDirs = await readdirAsync(PROJECT_ROOT);
    
    for (const userId of userDirs) {
      const userProjectDir = path.join(PROJECT_ROOT, userId);
      
      // Skip if not a directory
      try {
        const stats = await statAsync(userProjectDir);
        if (!stats.isDirectory()) continue;
      } catch (error) {
        console.error(`Error checking user directory ${userProjectDir}:`, error);
        continue;
      }
      
      // Ensure user directory exists in projects dir
      const userProjectsDir = path.join(PROJECTS_DIR, userId);
      await mkdirAsync(userProjectsDir, { recursive: true }).catch(() => {});
      
      console.log(`Processing user: ${userId}`);
      
      // Bi-directional synchronization
      // 1. Sync virtual_projects to projects
      await synchronizeUserFiles(userProjectDir, path.join(PROJECTS_DIR, userId));
      
      // 2. Sync from projects to virtual_projects
      if (fs.existsSync(userProjectsDir)) {
        await synchronizeUserFiles(userProjectsDir, userProjectDir);
      }
    }
    
    console.log('File system synchronization completed successfully!');
  } catch (error) {
    console.error('Error during file system synchronization:', error);
  }
}

/**
 * Synchronize all files for a specific user
 */
async function synchronizeUserFiles(sourceDir, targetDir) {
  // Get all files and directories recursively
  const allFiles = await getAllFiles(sourceDir, sourceDir);
  
  console.log(`Found ${allFiles.length} files to synchronize from ${path.basename(sourceDir)} to ${path.basename(targetDir)}`);
  
  // For each file, ensure it exists in the target location
  for (const filePath of allFiles) {
    try {
      // Skip directories
      const stats = await statAsync(filePath);
      if (stats.isDirectory()) continue;
      
      // Get the relative path from the source dir
      const relativePath = path.relative(sourceDir, filePath);
      
      // Skip files that are already in the root directory
      if (!relativePath.includes(path.sep)) continue;
      
      // Get the destination path in the target directory
      const destFilePath = path.join(targetDir, relativePath);
      
      // Create destination directory if it doesn't exist
      const destDir = path.dirname(destFilePath);
      await mkdirAsync(destDir, { recursive: true }).catch(() => {});
      
      // Get the content of the file
      const content = await readFileAsync(filePath, 'utf-8');
      
      // Check if destination exists and is different
      let shouldWrite = true;
      try {
        const existingContent = await readFileAsync(destFilePath, 'utf-8');
        if (existingContent === content) {
          shouldWrite = false;
        }
      } catch (err) {
        // File doesn't exist or can't be read - proceed with writing
      }
      
      if (shouldWrite) {
        console.log(`Synchronizing file: ${relativePath} → ${destFilePath}`);
        
        // Write to the destination path
        await writeFileAsync(destFilePath, content, 'utf-8');
        
        console.log(`Successfully synchronized ${relativePath}`);
      } else {
        console.log(`Skipping identical file: ${relativePath}`);
      }
    } catch (error) {
      console.error(`Error synchronizing file ${filePath}:`, error);
    }
  }
}

/**
 * Get all files recursively from a directory
 */
async function getAllFiles(dir, rootDir) {
  const entries = await readdirAsync(dir);
  
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry);
    
    try {
      const stats = await statAsync(fullPath);
      
      if (stats.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (entry === 'node_modules' || entry === '.git' || entry === '.next') {
          return [];
        }
        
        // Recursively get files
        return getAllFiles(fullPath, rootDir);
      } else {
        return [fullPath];
      }
    } catch (error) {
      console.error(`Error processing path ${fullPath}:`, error);
      return [];
    }
  }));
  
  return files.flat();
}

// Run the synchronization
syncAllUserFiles().then(() => {
  console.log('File synchronization complete');
}).catch(error => {
  console.error('Error running file synchronization:', error);
});

module.exports = {
  syncAllUserFiles
}; 