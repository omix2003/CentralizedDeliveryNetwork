import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authApi } from "@/lib/api/auth";

type UserRole = 'AGENT' | 'PARTNER' | 'ADMIN';

// Validate required environment variables
let NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL;

// In development, provide a fallback secret if not set
if (!NEXTAUTH_SECRET) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('[AUTH CONFIG] NEXTAUTH_SECRET not found. Using temporary development secret.');
    console.warn('[AUTH CONFIG] Please set NEXTAUTH_SECRET in .env.local for production.');
    NEXTAUTH_SECRET = 'KMm0Dm6e19k/0pXEosD4+KaO8G3ZAKFd3THVCAyiEXQ=';
    process.env.NEXTAUTH_SECRET = NEXTAUTH_SECRET;
  } else {
    const error = `NEXTAUTH_SECRET is not set. 

To fix this:
1. Create a .env.local file in the next-app/ directory
2. Add the following line:
   NEXTAUTH_SECRET="your-secret-key-here"

To generate a secret key, run:
   PowerShell: [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
   Linux/Mac: openssl rand -base64 32

3. Restart your development server after adding the file.`;
    console.error('[AUTH CONFIG]', error);
    throw new Error(error);
  }
}

// Set default NEXTAUTH_URL for development if not set
let authUrl = NEXTAUTH_URL;
if (!authUrl) {
  if (process.env.NODE_ENV === 'production') {
    const error = 'NEXTAUTH_URL is required in production. Please add it to your environment variables.';
    console.error('[AUTH CONFIG]', error);
    throw new Error(error);
  }
  // In development, use localhost:3000 as default
  authUrl = 'http://localhost:3000';
  process.env.NEXTAUTH_URL = authUrl;
}

// Log configuration (without exposing secret)
if (process.env.NODE_ENV === 'development') {
  console.log('[AUTH CONFIG] NextAuth configured:', {
    hasSecret: !!NEXTAUTH_SECRET,
    secretLength: NEXTAUTH_SECRET?.length || 0,
    url: authUrl,
    nodeEnv: process.env.NODE_ENV,
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || NEXTAUTH_SECRET,
  trustHost: true, // Required for NextAuth v5 - allows dynamic host detection
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('[AUTH] Missing credentials');
          throw new Error('Email and password are required');
        }

        try {
          console.log('[AUTH] Attempting login for:', credentials.email);

          const response = await authApi.login({
            email: credentials.email as string,
            password: credentials.password as string,
          });

          console.log('[AUTH] Login response received:', {
            hasUser: !!response?.user,
            hasToken: !!response?.token,
            userId: response?.user?.id
          });

          // Validate response structure
          if (!response || !response.user || !response.token) {
            console.error('[AUTH] Invalid response structure:', response);
            throw new Error('Invalid response from server. Please try again.');
          }

          // Validate required user fields
          if (!response.user.id || !response.user.email || !response.user.name || !response.user.role) {
            console.error('[AUTH] Missing required user fields:', response.user);
            throw new Error('Invalid user data received from server. Please try again.');
          }

          console.log('[AUTH] Login successful for user:', response.user.email);

          return {
            id: response.user.id,
            email: response.user.email,
            name: response.user.name,
            role: response.user.role,
            agentId: response.user.agentId,
            partnerId: response.user.partnerId,
            accessToken: response.token, // Store backend JWT token
          };
        } catch (error: any) {
          console.error('[AUTH] Login error:', error);

          // Extract error message for logging
          let errorMessage = 'Invalid email or password';

          if (error?.message) {
            errorMessage = error.message;
            console.error('[AUTH] Error message:', errorMessage);
          }

          if (error?.response) {
            const backendError = error.response.data?.error || error.response.data?.message;
            if (backendError) {
              errorMessage = backendError;
            }
            console.error('[AUTH] Backend response:', {
              status: error.response.status,
              data: error.response.data
            });
          } else if (error?.request) {
            errorMessage = 'Cannot connect to backend server. Please make sure it is running on port 5000.';
            console.error('[AUTH] No response from backend. Is the backend server running?');
            console.error('[AUTH] Request URL:', error.config?.url);
            console.error('[AUTH] Base URL:', error.config?.baseURL);
          } else {
            console.error('[AUTH] Error setting up request:', error.message);
          }

          console.error('[AUTH] Final error message:', errorMessage);

          // Throw error with message (NextAuth v5 will pass this to the client)
          throw new Error(errorMessage);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.agentId = (user as any).agentId;
        token.partnerId = (user as any).partnerId;
        token.accessToken = (user as any).accessToken; // Store backend JWT
      }
      return token;
    },
    async session({ session, token }) {
      try {
        if (session.user && token) {
          session.user.id = token.id as string;
          session.user.role = token.role as UserRole;
          session.user.agentId = (token.agentId as string) || undefined;
          session.user.partnerId = (token.partnerId as string) || undefined;
          session.accessToken = token.accessToken as string; // Add accessToken to session

          // Fetch latest profile picture from DB
          try {
            // We need to dynamically import prisma to avoid circular dependencies if any
            const { prisma } = await import('@/lib/prisma');
            const dbUser = await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { profilePicture: true }
            });
            session.user.image = dbUser?.profilePicture;
          } catch (e) {
            console.error('Failed to fetch profile picture', e);
          }
        }
        return session;
      } catch (error: any) {
        // Handle JWT decryption errors (e.g., when NEXTAUTH_SECRET changes)
        console.error('[AUTH] Session callback error:', error?.message || error);
        // Return empty session - user will need to login again
        return session;
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
});