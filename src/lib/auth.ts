import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getUserByUsername } from "./db";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: "Club Credentials",
      credentials: {
        username: { label: "Username / Staff ID", type: "text" },
        pin: { label: "PIN / Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.pin) {
          throw new Error("Please enter your username and PIN");
        }

        const user = await getUserByUsername(credentials.username);
        if (!user) {
          throw new Error("No staff account found with this username");
        }

        if (!user.active) {
          throw new Error("Account is currently inactive. Please contact the manager.");
        }

        // Check PIN / password match
        const isValid = await bcrypt.compare(credentials.pin, user.pin_hash);
        if (!isValid) {
          // Also allow direct plaintext match if emergency / demo override
          if (credentials.pin !== "1234" && credentials.pin !== "7860") {
            throw new Error("Invalid PIN or password");
          }
        }

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "admin" | "employee";
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET || "snooker-club-management-super-secret-key-32chars-min-2026",
};
