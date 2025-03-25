/**
 * Utility functions for file operations
 */

/**
 * Extract file name from a file path
 * @param path File path
 * @returns File name
 */
export function getFileNameFromPath(path: string): string {
  if (!path) return '';
  
  // Handle both Windows and Unix-style paths
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] || '';
}

/**
 * Get file extension from path
 * @param path File path
 * @returns File extension without the dot
 */
export function getFileExtension(path: string): string {
  if (!path) return '';
  
  const filename = getFileNameFromPath(path);
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Check if a file is a text file based on its extension
 * @param path File path
 * @returns True if file is likely a text file
 */
export function isTextFile(path: string): boolean {
  const textExtensions = [
    'txt', 'md', 'markdown', 'js', 'jsx', 'ts', 'tsx', 
    'json', 'html', 'htm', 'css', 'scss', 'sass', 'less',
    'xml', 'svg', 'yaml', 'yml', 'sh', 'bat', 'cmd',
    'py', 'rb', 'java', 'c', 'cpp', 'h', 'hpp', 'cs',
    'go', 'rs', 'php', 'sql', 'graphql', 'prisma'
  ];
  
  const ext = getFileExtension(path);
  return textExtensions.includes(ext);
}

/**
 * Get parent directory path from a file path
 * @param path File path
 * @returns Parent directory path
 */
export function getParentDirectory(path: string): string {
  if (!path) return '';
  
  // Handle both Windows and Unix-style paths
  const normalizedPath = path.replace(/\\/g, '/');
  const lastSlashIndex = normalizedPath.lastIndexOf('/');
  
  if (lastSlashIndex === -1) return '';
  return normalizedPath.substring(0, lastSlashIndex);
} 