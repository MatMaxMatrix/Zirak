// Security event logger for the application

// Log levels
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SECURITY = 'security' // Special level for security events
}

// Log entry type
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  requestId?: string;
  sourceIp?: string;
  userAgent?: string;
  path?: string;
  method?: string;
}

// Sanitize sensitive data from objects before logging
function sanitizeData(data: any): any {
  if (!data) return data;
  
  // If it's not an object, return as is
  if (typeof data !== 'object') return data;
  
  // If it's an array, sanitize each element
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  // Clone the object to avoid modifying the original
  const sanitized = { ...data };
  
  // List of sensitive field names (case-insensitive)
  const sensitiveFields = [
    'password', 'passwd', 'secret', 'token', 'key', 'auth',
    'credential', 'pin', 'api_key', 'apikey', 'access_token',
    'secret_key', 'private_key', 'encryption_key'
  ];
  
  // Sanitize each field
  Object.keys(sanitized).forEach(key => {
    // Check if this is a sensitive field
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveFields.some(field => lowerKey.includes(field));
    
    if (isSensitive) {
      // Mask the value but preserve type information
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = '[REDACTED_OBJECT]';
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeData(sanitized[key]);
    }
  });
  
  return sanitized;
}

// Format log entry for output
function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, message, context, userId, requestId, sourceIp, path, method } = entry;
  
  // Create base log entry
  const formattedEntry: Record<string, any> = {
    timestamp,
    level,
    message
  };
  
  // Add optional fields if present
  if (userId) formattedEntry.userId = userId;
  if (requestId) formattedEntry.requestId = requestId;
  if (sourceIp) formattedEntry.sourceIp = sourceIp;
  if (path) formattedEntry.path = path;
  if (method) formattedEntry.method = method;
  
  // Add sanitized context if present
  if (context) {
    formattedEntry.context = sanitizeData(context);
  }
  
  return JSON.stringify(formattedEntry);
}

// Core logger function
function logEvent(
  level: LogLevel,
  message: string,
  options: {
    context?: Record<string, any>;
    userId?: string;
    requestId?: string;
    sourceIp?: string;
    userAgent?: string;
    path?: string;
    method?: string;
  } = {}
): void {
  // Create log entry
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...options
  };
  
  // Format the entry
  const formattedEntry = formatLogEntry(entry);
  
  // Log to appropriate output
  if (process.env.NODE_ENV === 'production') {
    // In production: 
    // - Log to stdout (for collection by logging infrastructure)
    // - Potentially send security events to a separate service
    console.log(formattedEntry);
    
    // For security events, you might want to send to a dedicated service
    if (level === LogLevel.SECURITY) {
      // TODO: Integration with external security logging service
      // securityMonitoringService.logEvent(entry);
    }
  } else {
    // In development, log with colors for better readability
    let logFn = console.log;
    
    switch (level) {
      case LogLevel.DEBUG:
        logFn = console.debug;
        break;
      case LogLevel.INFO:
        logFn = console.info;
        break;
      case LogLevel.WARN:
        logFn = console.warn;
        break;
      case LogLevel.ERROR:
      case LogLevel.SECURITY:
        logFn = console.error;
        break;
    }
    
    logFn(formattedEntry);
  }
}

// Public API
export const Logger = {
  debug: (message: string, options = {}) => logEvent(LogLevel.DEBUG, message, options),
  info: (message: string, options = {}) => logEvent(LogLevel.INFO, message, options),
  warn: (message: string, options = {}) => logEvent(LogLevel.WARN, message, options),
  error: (message: string, options = {}) => logEvent(LogLevel.ERROR, message, options),
  security: (message: string, options = {}) => logEvent(LogLevel.SECURITY, message, options)
};

// Middleware function to extract request information
export function extractRequestInfo(req: Request): {
  requestId: string;
  sourceIp: string;
  userAgent: string;
  path: string;
  method: string;
} {
  // Generate a unique request ID if not present
  const requestId = req.headers.get('x-request-id') || 
                   crypto.randomUUID();
  
  // Get client IP from headers or connection
  const forwarded = req.headers.get('x-forwarded-for');
  const sourceIp = forwarded ? forwarded.split(',')[0].trim() : 
                 req.headers.get('x-real-ip') || 'unknown';
  
  // Get other request details
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;
  
  return { requestId, sourceIp, userAgent, path, method };
} 