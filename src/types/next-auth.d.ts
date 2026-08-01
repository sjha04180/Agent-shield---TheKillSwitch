import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: 'owner' | 'admin';
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: 'owner' | 'admin';
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: 'owner' | 'admin';
  }
}
