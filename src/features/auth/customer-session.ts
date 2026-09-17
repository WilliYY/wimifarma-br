type CustomerToken = { id?: unknown; role?: unknown; customerId?: unknown; googleSubject?: unknown };

export function isVerifiedGoogleProfile(profile: { email?: unknown; email_verified?: unknown; sub?: unknown } | undefined, subject: string) {
  return profile?.email_verified === true && typeof profile.email === "string" && profile.email.includes("@") && Boolean(subject) && profile.sub === subject;
}
type CustomerIdentity = {
  id: string; status: string; googleSubject: string | null;
  staffAccess: { id: string; role: string; isActive: boolean } | null;
};

export async function refreshCustomerToken<T extends CustomerToken>(token: T, find: (id: string) => Promise<CustomerIdentity | null>) {
  const id = typeof token.customerId === "string" ? token.customerId : token.id;
  if (typeof id !== "string" || !id) return null;
  const customer = await find(id);
  if (!customer || customer.id !== id || customer.status !== "ACTIVE" || customer.staffAccess?.isActive === false) return null;
  if (token.googleSubject && token.googleSubject !== customer.googleSubject) return null;
  // Only a freshly verified Google login can use the explicitly assigned staff link.
  const staff = token.googleSubject ? customer.staffAccess : null;
  return {
    ...token, customerId: id,
    id: staff && staff.role !== "CUSTOMER" ? staff.id : id,
    role: staff?.role ?? "CUSTOMER",
  } as T;
}

export function sessionCustomerId(session: { user?: { id?: string; role?: string; customerId?: string } } | null) {
  return session?.user?.customerId || (session?.user?.role === "CUSTOMER" ? session.user.id : undefined);
}
