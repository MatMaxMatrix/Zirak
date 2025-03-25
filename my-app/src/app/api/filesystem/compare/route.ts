import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Define virtual projects directory (same as in filesystem route)
const PROJECT_ROOT = path.join(process.cwd(), 'virtual_projects');

// Get or initialize the user's project directory
const getUserProjectDir = async (userId: string): Promise<string> => {
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
    console.error('Error initializing user environment:', error);
    return PROJECT_ROOT;
  }
};

// Helper function to normalize paths
const normalizePath = (filePath: string): string => {
  return filePath
    .replace(/^\/project\//, '')
    .replace(/\/+/g, '/') // Replace multiple slashes with single slash
    .replace(/^\/*/, ''); // Ensure no leading slash to avoid resolving to root
};

export async function GET(request: NextRequest) {
  try {
    // Get user ID and file paths from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'default_user';
    const file1Path = searchParams.get('file1');
    const file2Path = searchParams.get('file2');
    
    if (!file1Path || !file2Path) {
      return NextResponse.json({ 
        error: 'Missing file paths', 
        details: 'Both file1 and file2 query parameters are required'
      }, { status: 400 });
    }
    
    // Get user's project directory
    const userProjectDir = await getUserProjectDir(userId);
    
    // Normalize and resolve the file paths
    const normalizedFile1Path = normalizePath(file1Path);
    const normalizedFile2Path = normalizePath(file2Path);
    
    const resolvedFile1Path = path.resolve(userProjectDir, normalizedFile1Path);
    const resolvedFile2Path = path.resolve(userProjectDir, normalizedFile2Path);
    
    console.log('Comparing files:', resolvedFile1Path, resolvedFile2Path);
    
    // Security check - make sure both paths are within the user's project directory
    if (!resolvedFile1Path.startsWith(userProjectDir) || !resolvedFile2Path.startsWith(userProjectDir)) {
      console.warn(`Security warning: Attempted to access path outside user directory`);
      return NextResponse.json({ 
        error: 'Access denied', 
        details: 'One or both file paths are outside the permitted directory.'
      }, { status: 403 });
    }
    
    // Check if files exist
    try {
      await fs.access(resolvedFile1Path);
      await fs.access(resolvedFile2Path);
    } catch (error) {
      return NextResponse.json({ 
        error: 'File not found', 
        details: 'One or both of the specified files do not exist.'
      }, { status: 404 });
    }
    
    // Read file contents
    const file1Content = await fs.readFile(resolvedFile1Path, 'utf-8');
    const file2Content = await fs.readFile(resolvedFile2Path, 'utf-8');
    
    return NextResponse.json({
      file1: {
        path: file1Path,
        name: path.basename(file1Path),
        content: file1Content
      },
      file2: {
        path: file2Path,
        name: path.basename(file2Path),
        content: file2Content
      }
    });
    
  } catch (error) {
    console.error('Error comparing files:', error);
    return NextResponse.json({ 
      error: 'Failed to compare files',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 