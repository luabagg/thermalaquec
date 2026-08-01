import type { ActionFunctionArgs } from "@remix-run/node";
import { isFormKind, submitToFormspree } from "~/lib/formspree.server";
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

function jsonResponse(body: FormActionResponse, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  return Response.json(body, { ...init, headers });
}

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

  const rate = await checkFormRateLimit(request, formParam);
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

  let payload: Record<string, unknown>;
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("invalid");
    }
    payload = body as Record<string, unknown>;
  } catch {
    return jsonResponse(
      { ok: false, code: "bad_request", error: "Payload inválido." },
      { status: 400, headers },
    );
  }

  const result = await submitToFormspree(formParam, payload);
  if (!result.ok) {
    const upstreamRateLimited = result.status === 429;
    return jsonResponse(
      {
        ok: false,
        code: upstreamRateLimited ? "rate_limited" : "upstream_error",
        error: upstreamRateLimited
          ? "Muitas tentativas. Aguarde um momento e tente novamente."
          : (result.error ?? "Erro ao enviar."),
        ...(upstreamRateLimited ? { retryAfterSec: 60 } : {}),
      },
      { status: upstreamRateLimited ? 429 : result.status >= 400 ? result.status : 502, headers },
    );
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
