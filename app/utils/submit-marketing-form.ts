import { FORMSPREE_ENDPOINTS, type FormKind } from "~/lib/formspree";

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

async function postGate(
  kind: FormKind,
  intent: "claim" | "confirm",
): Promise<{ response: Response; body: FormApiBody | null }> {
  const response = await fetch(`/api/forms/${kind}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ intent }),
  });
  const body = (await response.json().catch(() => null)) as FormApiBody | null;
  return { response, body };
}

/**
 * 1) Server claim (rate-limit gate)
 * 2) Browser → Formspree (keeps page Referer for Formspree domain checks)
 * 3) Server confirm (start cooldown only after Formspree accepts)
 */
export async function submitMarketingForm(
  kind: FormKind,
  payload: Record<string, unknown>,
): Promise<FormSubmitResult> {
  const claim = await postGate(kind, "claim");

  if (claim.response.status === 429 || claim.body?.code === "rate_limited") {
    const retryHeader = Number(claim.response.headers.get("Retry-After") || NaN);
    const retryAfterSec =
      claim.body?.retryAfterSec ??
      (Number.isFinite(retryHeader) ? retryHeader : undefined);
    return {
      ok: false,
      code: "rate_limited",
      retryAfterSec,
      error: claim.body?.error?.trim() || rateLimitMessage(retryAfterSec),
    };
  }

  if (!claim.response.ok || !claim.body?.ok) {
    return {
      ok: false,
      code: claim.body?.code,
      error: claim.body?.error?.trim() || "Não foi possível enviar. Tente novamente.",
    };
  }

  const formspreeResponse = await fetch(FORMSPREE_ENDPOINTS[kind], {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!formspreeResponse.ok) {
    let error = "Não foi possível enviar. Tente novamente.";
    try {
      const data = (await formspreeResponse.json()) as { error?: string };
      if (data.error?.trim()) error = data.error.trim();
    } catch {
      // ignore non-JSON error bodies
    }

    if (formspreeResponse.status === 429) {
      return {
        ok: false,
        code: "upstream_rate_limited",
        error: "O serviço de envio está ocupado. Tente novamente em instantes.",
        retryAfterSec: 60,
      };
    }

    return { ok: false, code: "upstream_error", error };
  }

  // Best-effort: Formspree already accepted; cooldown still matters for UX.
  await postGate(kind, "confirm").catch(() => null);

  return { ok: true };
}
