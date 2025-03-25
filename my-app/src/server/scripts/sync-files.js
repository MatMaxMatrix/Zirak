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

/**
 * Main function to synchronize all files for all users
 */
async function syncAllUserFiles() {
  try {
    console.log('Starting file system synchronization...');
    
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
      
      console.log(`Processing user: ${userId}`);
      await synchronizeUserFiles(userProjectDir);
    }
    
    console.log('File system synchronization completed successfully!');
  } catch (error) {
    console.error('Error during file system synchronization:', error);
  }
}

/**
 * Synchronize all files for a specific user
 */
async function synchronizeUserFiles(userProjectDir) {
  // Get all files and directories recursively
  const allFiles = await getAllFiles(userProjectDir, userProjectDir);
  
  console.log(`Found ${allFiles.length} files to synchronize for user directory ${path.basename(userProjectDir)}`);
  
  // For each file, ensure it exists in both locations
  for (const filePath of allFiles) {
    try {
      // Skip directories
      const stats = await statAsync(filePath);
      if (stats.isDirectory()) continue;
      
      // Get the relative path from the user project dir
      const relativePath = path.relative(userProjectDir, filePath);
      // Skip files that are already in the root directory
      if (!relativePath.includes(path.sep)) continue;
      
      // Get the content of the file
      const content = await readFileAsync(filePath, 'utf-8');
      
      // Create the file in the user's root directory
      const rootFilePath = path.join(userProjectDir, path.basename(filePath));
      
      console.log(`Synchronizing file: ${relativePath} → ${path.basename(filePath)}`);
      
      // Write to the root path
      await writeFileAsync(rootFilePath, content, 'utf-8');
      
      console.log(`Successfully synchronized ${relativePath}`);
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