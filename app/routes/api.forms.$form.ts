import type { ActionFunctionArgs } from "@remix-run/node";
import { isFormKind } from "~/lib/formspree";
import { allowedOrigin } from "~/utils/allowedOrigins";
import {
  checkFormRateLimit,
  markFormSubmitted,
} from "~/utils/form-rate-limit.server";

type FormActionResponse = {
  ok: boolean;
  error?: string;
  code?: string;
  retryAfterSec?: number;
};

type FormIntent = "claim" | "confirm";

function jsonResponse(body: FormActionResponse, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  return Response.json(body, { ...init, headers });
}

function parseIntent(value: unknown): FormIntent | null {
  return value === "claim" || value === "confirm" ? value : null;
}

/**
 * Rate-limit gate only. Formspree must be called from the browser so the
 * page Referer/Origin reach Formspree (domain restrictions + spam filters).
 *
 * - claim: may the client submit to Formspree?
 * - confirm: mark cooldown after a successful Formspree response
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const headers = new Headers();

  if (request.method !== "POST") {
    return jsonResponse(
      { ok: false, code: "method_not_allowed", error: "Método não permitido." },
      { status: 405, headers },
    );
  }

  const formParam = params.form ?? "";
  if (!isFormKind(formParam)) {
    return jsonResponse(
      { ok: false, code: "not_found", error: "Formulário inválido." },
      { status: 404, headers },
    );
  }

  const origin = request.headers.get("origin");
  if (process.env.NODE_ENV === "production" && (!origin || !allowedOrigin(origin))) {
    return jsonResponse(
      { ok: false, code: "forbidden", error: "Origem não permitida." },
      { status: 403, headers },
    );
  }

  let intent: FormIntent | null = null;
  try {
    const body = await request.json();
    intent = parseIntent(
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as { intent?: unknown }).intent
        : null,
    );
  } catch {
    intent = null;
  }

  if (!intent) {
    return jsonResponse(
      { ok: false, code: "bad_request", error: "Payload inválido." },
      { status: 400, headers },
    );
  }

  const rate = await checkFormRateLimit(request, formParam);

  if (intent === "claim") {
    if (!rate.allowed) {
      headers.set("Retry-After", String(rate.retryAfterSec));
      return jsonResponse(
        {
          ok: false,
          code: "rate_limited",
          error: `Muitas tentativas. Aguarde ${rate.retryAfterSec}s e tente novamente.`,
          retryAfterSec: rate.retryAfterSec,
        },
        { status: 429, headers },
      );
    }
    return jsonResponse({ ok: true }, { status: 200, headers });
  }

  // confirm — only mark after the browser successfully posted to Formspree
  if (!rate.allowed) {
    // Already in cooldown (double-confirm / race). Treat as success for UX.
    return jsonResponse({ ok: true }, { status: 200, headers });
  }

  await markFormSubmitted(request, formParam, rate.state, headers);
  return jsonResponse({ ok: true }, { status: 200, headers });
}

export function loader() {
  return jsonResponse(
    { ok: false, code: "method_not_allowed", error: "Método não permitido." },
    { status: 405 },
  );
}
