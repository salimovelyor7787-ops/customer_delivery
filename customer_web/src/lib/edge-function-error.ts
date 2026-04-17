/** Normalize various Edge Function / Supabase error JSON shapes for user-facing toasts. */
export function extractEdgeErrorMessage(payload: unknown, status: number, rawText: string): string {
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (typeof o.error === "string" && o.error.trim()) return o.error;
    if (typeof o.message === "string" && o.message.trim()) return o.message;
    if (o.error && typeof o.error === "object") {
      const inner = o.error as Record<string, unknown>;
      if (typeof inner.message === "string" && inner.message.trim()) return inner.message;
    }
  }
  const t = rawText.trim();
  if (t.startsWith("<")) return `Server javobi JSON emas (${status})`;
  if (status === 502) return "Server bilan aloqa uzildi";
  if (t.length > 0 && t.length <= 280) return t;
  return "Buyurtma yuborilmadi";
}

export function isLikelyJwt(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}
