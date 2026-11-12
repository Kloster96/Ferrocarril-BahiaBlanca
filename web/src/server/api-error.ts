/** The single error shape of the API: `{ error: { code, message } }` with the right HTTP status. */
export function apiError(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}
