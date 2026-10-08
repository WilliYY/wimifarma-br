import { receiveAsaasSandboxWebhook } from "@/features/payments/asaas-webhook";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) { return receiveAsaasSandboxWebhook(request); }
