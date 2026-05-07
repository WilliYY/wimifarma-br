import { AdminLoginForm } from "@/features/auth/components/admin-login-form";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function Page({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl ?? "/admin/dashboard";

  return (
    <main className="grid min-h-screen place-items-center bg-surface-subtle px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-xl shadow-red-950/5">
        <div className="mb-7">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand text-xl font-black text-white">
            W
          </span>
          <h1 className="mt-5 text-3xl font-black text-ink">
            Entrar no admin
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Acesso reservado para a equipe da Wimifarma.
          </p>
        </div>
        <AdminLoginForm callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}
