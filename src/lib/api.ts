export async function readJsonBody(request: Request) {
  return request.json().catch(() => null);
}
