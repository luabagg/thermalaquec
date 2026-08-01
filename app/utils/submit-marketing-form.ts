export type FormSubmitResult =
  | { ok: true }
  | { ok: false; error: string; code?: string; retryAfterSec?: number };

type FormApiBody = {
  ok?: boolean;
  error?: string;
  code?: string;
  retryAfterSec?: number;
};

function rateLimitMessage(retryAfterSec?: number): string {
  if (retryAfterSec && retryAfterSec > 0) {
    return `Muitas tentativas. Aguarde ${retryAfterSec}s e tente novamente.`;
  }
  return "Muitas tentativas. Aguarde um momento e tente novamente.";
}

function looksLikeRateLimitError(message: string | undefined): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("too many") ||
    normalized.includes("rate limit") ||
    normalized.includes("muitas tentativas") ||
    normalized.includes("aguarde")
  );
}

function isRateLimited(status: number, body: FormApiBody | null): boolean {
  if (status === 429) return true;
  if (body?.code === "rate_limited") return true;
  return looksLikeRateLimitError(body?.error);
}

/**
 * POST JSON to `/api/forms/:kind` and normalize success / rate-limit / errors
 * for toast + inline alerts.
 */
export async function submitMarketingForm(
  kind: "contact" | "calculator",
  payload: Record<string, unknown>,
): Promise<FormSubmitResult> {
  const response = await fetch(`/api/forms/${kind}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => null)) as FormApiBody | null;

  if (response.ok && body?.ok) {
    return { ok: true };
  }

  if (isRateLimited(response.status, body)) {
    const retryHeader = Number(response.headers.get("Retry-After") || NaN);
    const retryAfterSec =
      body?.retryAfterSec ?? (Number.isFinite(retryHeader) ? retryHeader : undefined);

    const fromApi = body?.error?.trim();
    const error =
      fromApi && !/too many|rate limit/i.test(fromApi)
        ? fromApi
        : rateLimitMessage(retryAfterSec);

    return {
      ok: false,
      code: "rate_limited",
      retryAfterSec,
      error,
    };
  }

  return {
    ok: false,
    code: body?.code,
    error: body?.error?.trim() || "Não foi possível enviar. Tente novamente.",
  };
}
