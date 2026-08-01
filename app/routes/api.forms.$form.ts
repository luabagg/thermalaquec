import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { isFormKind, submitToFormspree } from "~/lib/formspree.server";
import { allowedOrigin } from "~/utils/allowedOrigins";
import {
  checkFormRateLimit,
  markFormSubmitted,
} from "~/utils/form-rate-limit.server";

type FormActionResponse = {
  ok: boolean;
  error?: string;
  retryAfterSec?: number;
};

export async function action({ request, params }: ActionFunctionArgs) {
  const headers = new Headers();

  if (request.method !== "POST") {
    return json<FormActionResponse>(
      { ok: false, error: "Método não permitido." },
      { status: 405, headers },
    );
  }

  const formParam = params.form ?? "";
  if (!isFormKind(formParam)) {
    return json<FormActionResponse>(
      { ok: false, error: "Formulário inválido." },
      { status: 404, headers },
    );
  }

  const origin = request.headers.get("origin");
  if (process.env.NODE_ENV === "production" && (!origin || !allowedOrigin(origin))) {
    return json<FormActionResponse>(
      { ok: false, error: "Origem não permitida." },
      { status: 403, headers },
    );
  }

  const rate = await checkFormRateLimit(request, formParam);
  if (!rate.allowed) {
    headers.set("Retry-After", String(rate.retryAfterSec));
    return json<FormActionResponse>(
      {
        ok: false,
        error: `Aguarde ${rate.retryAfterSec}s antes de enviar novamente.`,
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
    return json<FormActionResponse>(
      { ok: false, error: "Payload inválido." },
      { status: 400, headers },
    );
  }

  const result = await submitToFormspree(formParam, payload);
  if (!result.ok) {
    return json<FormActionResponse>(
      { ok: false, error: result.error ?? "Erro ao enviar." },
      { status: result.status >= 400 ? result.status : 502, headers },
    );
  }

  await markFormSubmitted(request, formParam, rate.state, headers);
  return json<FormActionResponse>({ ok: true }, { status: 200, headers });
}

export function loader() {
  return json({ ok: false, error: "Método não permitido." }, { status: 405 });
}
