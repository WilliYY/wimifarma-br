import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/generated/prisma/client";

type SessionRole = UserRole | "CUSTOMER";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: SessionRole;
    } & DefaultSession["user"];
  }

  interface User {
    role?: SessionRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: SessionRole;
  }
}
