export class RequestBodyError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

// Limits apply to bytes actually received, including chunked requests and extra fields.
export async function readLimitedBody(request: Request, { maxBytes, timeoutMs = 10_000 }: { maxBytes: number; timeoutMs?: number }) {
  const length = request.headers.get("content-length");
  const encoding = request.headers.get("content-encoding");
  if (encoding && encoding.toLowerCase() !== "identity") throw new RequestBodyError("Conteúdo comprimido não permitido.", 415);
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new RequestBodyError("Solicitação muito grande.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new RequestBodyError("Corpo inválido.", 400);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RequestBodyError("Tempo de envio excedido.", 408)), timeoutMs);
  });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new RequestBodyError("Solicitação muito grande.", 413);
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } catch (error) {
    // A transport that never resolves cancel() must not retain the handler.
    void reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
}

export async function readJsonBody(request: Request) {
  // Existing routes treat invalid input as null (400/422); preserve that contract.
  // Multipart callers use readLimitedBody directly to retain 413/408/415 statuses.
  try {
    const bytes = await readLimitedBody(request, { maxBytes: 64_000 });
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch { return null; }
}
