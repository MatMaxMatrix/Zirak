import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

// For demo purposes, we're using a simple credentials provider
// In a real app, you would use OAuth providers (GitHub, Google, etc.)
// or integrate with a database for user management

// Define user type
type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
};

// Mock users database
const users: User[] = [
  {
    id: "1",
    name: "Admin User",
    email: "admin@example.com",
    password: "password123",
    role: "admin",
  },
  {
    id: "2",
    name: "Demo User",
    email: "user@example.com",
    password: "password123",
    role: "user",
  },
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  debug: true, // Enable debug mode to see more detailed logs
  callbacks: {
    authorized({ auth, request }) {
      // For simplicity, we'll only protect the dashboard path
      const isLoggedIn = !!auth?.user;
      const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");

      if (isDashboard) {
        return isLoggedIn;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.role = (user as User).role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          // Validate credentials format
          const parsedCredentials = z
            .object({ email: z.string().email(), password: z.string().min(6) })
            .safeParse(credentials);

          if (parsedCredentials.success) {
            const { email, password } = parsedCredentials.data;
            console.log(`Attempting to authenticate user: ${email}`);

            const user = users.find(user => user.email === email && user.password === password);

            if (!user) {
              console.log(`User not found or password incorrect for: ${email}`);
              return null;
            }

            console.log(`User authenticated successfully: ${email}`);
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            };
          }

          console.log("Credential validation failed:", parsedCredentials.error);
          return null;
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
});
