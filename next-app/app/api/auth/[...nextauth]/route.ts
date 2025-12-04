import { handlers } from "@/auth"

// Validate handlers are available
if (!handlers) {
  const error = 'NextAuth handlers are not available. This usually means NEXTAUTH_SECRET or NEXTAUTH_URL is not configured correctly.';
  console.error('[AUTH ROUTE]', error);
  console.error('[AUTH ROUTE] NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET');
  console.error('[AUTH ROUTE] NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'NOT SET');
  throw new Error(error);
}

export const { GET, POST } = handlers



