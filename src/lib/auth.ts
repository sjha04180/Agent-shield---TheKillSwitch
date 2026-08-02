import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { dbConnect } from "@/lib/dbConnect";
import { User } from "@/models/User";
import { verifyPassword } from "@/utils/crypto";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        await dbConnect();
        
        const user = await User.findOne({ email: (credentials.email as string).toLowerCase() });
        if (!user || !user.passwordHash) {
          throw new Error("No user found with this email");
        }

        const isValid = verifyPassword(credentials.password as string, user.passwordHash);
        if (!isValid) {
          throw new Error("Incorrect password");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) return false;
        await dbConnect();
        
        let dbUser = await User.findOne({ email: user.email.toLowerCase() });
        if (!dbUser) {
          dbUser = await User.create({
            email: user.email.toLowerCase(),
            name: user.name || "Google User",
            role: "owner",
            status: "active",
          });
        }
        
        user.id = dbUser._id.toString();
        user.role = dbUser.role || "owner";
      }
      return true;
    }
  }
});
