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

type GoogleCustomerProfile = {
  email?: unknown;
  name?: unknown;
  picture?: unknown;
  sub?: unknown;
};

function isAppRole(role: unknown): role is (typeof appRoles)[number] {
  return typeof role === "string" && appRoles.includes(role as never);
}

function stringOrUndefined(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || undefined;
}

function fallbackNameFromEmail(email: string | undefined) {
  return email?.split("@")[0] || "Cliente Wimifarma";
}

async function persistGoogleCustomer(input: {
  email?: string;
  googleSubject?: string;
  imageUrl?: string;
  name?: string;
}) {
  const prisma = getPrisma();
  const email = normalizeEmail(input.email);

  if (!email && !input.googleSubject) {
    return null;
  }

  const existingBySubject = input.googleSubject
    ? await prisma.customer.findUnique({
        where: { googleSubject: input.googleSubject },
      })
    : null;

  const existing =
    existingBySubject ??
    (email
      ? await prisma.customer.findUnique({
          where: { email },
        })
      : null);

  const customerData = {
    email,
    googleSubject: input.googleSubject,
    imageUrl: input.imageUrl,
    lastLoginAt: new Date(),
    name: input.name ?? existing?.name ?? fallbackNameFromEmail(email),
  };

  if (existing) {
    return prisma.customer.update({
      data: customerData,
      where: { id: existing.id },
    });
  }

  return prisma.customer.create({
    data: customerData,
  });
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

        if (user) {
          if (!user.isActive) {
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
        }

        const customer = await prisma.customer.findUnique({
          where: { email },
        });

        if (
          !customer ||
          customer.status !== "ACTIVE" ||
          !customer.passwordHash
        ) {
          await recordLoginAttempt(email, false);
          return null;
        }

        const passwordMatches = await compare(password, customer.passwordHash);

        if (!passwordMatches) {
          await recordLoginAttempt(email, false);
          return null;
        }

        await prisma.customer.update({
          data: { lastLoginAt: new Date() },
          where: { id: customer.id },
        });
        await recordLoginAttempt(email, true);

        return {
          email: customer.email,
          id: customer.id,
          image: customer.imageUrl,
          name: customer.name,
          role: "CUSTOMER",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (account?.provider === "google") {
        const googleProfile = profile as GoogleCustomerProfile | undefined;
        const customer = await persistGoogleCustomer({
          email:
            normalizeEmail(stringOrUndefined(user?.email)) ??
            normalizeEmail(stringOrUndefined(token.email)) ??
            normalizeEmail(stringOrUndefined(googleProfile?.email)),
          googleSubject:
            stringOrUndefined(account.providerAccountId) ??
            stringOrUndefined(googleProfile?.sub),
          imageUrl:
            stringOrUndefined(user?.image) ??
            stringOrUndefined(token.picture) ??
            stringOrUndefined(googleProfile?.picture),
          name:
            stringOrUndefined(user?.name) ??
            stringOrUndefined(token.name) ??
            stringOrUndefined(googleProfile?.name),
        });

        if (customer) {
          token.email = customer.email;
          token.id = customer.id;
          token.name = customer.name;
          token.picture = customer.imageUrl;
          token.role = "CUSTOMER";
          return token;
        }
      }

      if (user) {
        token.id = user.id;
        token.role = isAppRole(user.role) ? user.role : "CUSTOMER";
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.role = isAppRole(token.role) ? token.role : "CUSTOMER";

        if (session.user.role === "CUSTOMER" && session.user.id) {
          const prisma = getPrisma();
          const customer = await prisma.customer.findUnique({
            select: {
              email: true,
              imageUrl: true,
              name: true,
            },
            where: { id: session.user.id },
          });

          if (customer) {
            if (customer.email) session.user.email = customer.email;
            if (customer.imageUrl) session.user.image = customer.imageUrl;
            session.user.name = customer.name;
          }
        }
      }

      return session;
    },
  },
  secret: authSecret,
  trustHost: true,
} satisfies NextAuthConfig;

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);
