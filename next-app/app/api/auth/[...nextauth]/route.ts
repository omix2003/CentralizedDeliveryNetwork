import { handlers } from "@/auth"

export const { GET, POST } = handlers

// Add error handling for NextAuth configuration issues
if (!handlers) {
  console.error('[AUTH ROUTE] NextAuth handlers are not available. Check auth.ts configuration.');
}



