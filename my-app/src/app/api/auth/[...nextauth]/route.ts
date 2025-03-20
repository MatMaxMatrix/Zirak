import { handlers } from "@/auth";

// Add error logging for authentication requests
console.log("Auth API route initialized");

// Export the handlers directly without modification
export const { GET, POST } = handlers;

// Error handling is now managed by Next.js internally
