type StaffToken = { id?: unknown; role?: unknown; credentialVersion?: unknown; customerId?: unknown };
type StaffRecord = { id: string; role: string; isActive: boolean; credentialVersion: string; customerId?: string | null };

export async function refreshStaffToken<T extends StaffToken>(
  token: T,
  findUser: (id: string) => Promise<StaffRecord | null>,
): Promise<T | null> {
  if (token.role === "CUSTOMER") return token;
  const staffRoles = ["ADMIN", "MANAGER", "STAFF"];
  if (typeof token.role !== "string" || !staffRoles.includes(token.role)) return null;
  if (typeof token.id !== "string" || !token.id) return null;

  const user = await findUser(token.id);
  if (!user?.isActive || user.id !== token.id || !staffRoles.includes(user.role)) return null;
  if (typeof token.credentialVersion !== "string" || token.credentialVersion !== user.credentialVersion) return null;

  const { customerId: previousCustomerId, ...rest } = token;
  void previousCustomerId;
  return { ...rest, role: user.role, ...(user.customerId ? { customerId: user.customerId } : {}) } as T;
}
