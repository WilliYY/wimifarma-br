import { compare } from "bcryptjs";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { getPrisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";

const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_MAX_FAILURES = 8;
const authSecret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV === "production"
    ? undefined
    : "wimifarma-local-dev-secret");
const appRoles = ["ADMIN", "MANAGER", "STAFF", "CUSTOMER"] as const;

function isAppRole(role: unknown): role is (typeof appRoles)[number] {
  return typeof role === "string" && appRoles.includes(role as never);
}

async function recordLoginAttempt(email: string, success: boolean) {
  const prisma = getPrisma();

  await prisma.loginAttempt.create({
    data: {
      email,
      success,
    },
  });
}

async function hasTooManyFailedLogins(email: string) {
  const prisma = getPrisma();
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60 * 1000);
  const failures = await prisma.loginAttempt.count({
    where: {
      createdAt: {
        gte: windowStart,
      },
      email,
      success: false,
    },
  });

  return failures >= LOGIN_MAX_FAILURES;
}

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    Credentials({
      credentials: {
        email: { label: "Email ou usuario", type: "text" },
        password: { label: "Senha", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const isDemoAdmin =
          password === "adm" &&
          ["adm", "adm@wimifarma.local", "admin@wimifarma.local"].includes(
            email,
          );

        if (isDemoAdmin) {
          return {
            email: "adm@wimifarma.local",
            id: "demo-admin",
            name: "Administrador Wimifarma",
            role: "ADMIN",
          };
        }

        if (await hasTooManyFailedLogins(email)) {
          return null;
        }

        if (!email.includes("@")) {
          await recordLoginAttempt(email, false);
          return null;
        }

        const prisma = getPrisma();
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.isActive) {
          await recordLoginAttempt(email, false);
          return null;
        }

        const passwordMatches = await compare(password, user.passwordHash);

        if (!passwordMatches) {
          await recordLoginAttempt(email, false);
          return null;
        }

        await prisma.user.update({
          data: { lastLoginAt: new Date() },
          where: { id: user.id },
        });
        await recordLoginAttempt(email, true);

        return {
          email: user.email,
          id: user.id,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = isAppRole(user.role) ? user.role : "CUSTOMER";
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role = isAppRole(token.role) ? token.role : "CUSTOMER";
      }

      return session;
    },
  },
  secret: authSecret,
  trustHost: true,
} satisfies NextAuthConfig;

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
