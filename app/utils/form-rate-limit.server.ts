import { createCookie } from "@remix-run/node";
import type { FormKind } from "~/lib/formspree";

/** Min seconds between successful submits per form, per browser. */
export const FORM_COOLDOWN_SEC = 60;

/** Burst protection across requests that clear cookies (best-effort on serverless). */
const IP_WINDOW_MS = FORM_COOLDOWN_SEC * 1000;
const IP_MAX_HITS = 3;

type CookieState = Partial<Record<FormKind, number>>;

type IpBucket = { hits: number[]; };

const ipBuckets = new Map<string, IpBucket>();

const cookieSecrets = [
  process.env.SUPABASE_JWT_SECRET,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
].filter((value): value is string => Boolean(value));

const formRateLimitCookie = createCookie("ta_form_rl", {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60,
  ...(cookieSecrets.length > 0 ? { secrets: cookieSecrets } : {}),
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function pruneHits(hits: number[], now: number): number[] {
  return hits.filter((ts) => now - ts < IP_WINDOW_MS);
}

export type RateLimitDecision =
  | { allowed: true; state: CookieState }
  | { allowed: false; retryAfterSec: number; state: CookieState };

export async function checkFormRateLimit(
  request: Request,
  form: FormKind,
): Promise<RateLimitDecision> {
  const now = Date.now();
  const state = ((await formRateLimitCookie.parse(request.headers.get("Cookie"))) ??
    {}) as CookieState;

  const lastSubmit = state[form];
  if (typeof lastSubmit === "number") {
    const elapsed = now - lastSubmit;
    if (elapsed < FORM_COOLDOWN_SEC * 1000) {
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((FORM_COOLDOWN_SEC * 1000 - elapsed) / 1000)),
        state,
      };
    }
  }

  const ip = clientIp(request);
  const bucket = ipBuckets.get(ip) ?? { hits: [] };
  bucket.hits = pruneHits(bucket.hits, now);
  if (bucket.hits.length >= IP_MAX_HITS) {
    const oldest = bucket.hits[0] ?? now;
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((IP_WINDOW_MS - (now - oldest)) / 1000)),
      state,
    };
  }

  ipBuckets.set(ip, bucket);
  return { allowed: true, state };
}

export async function markFormSubmitted(
  request: Request,
  form: FormKind,
  state: CookieState,
  headers: Headers,
): Promise<void> {
  const now = Date.now();
  const ip = clientIp(request);
  const bucket = ipBuckets.get(ip) ?? { hits: [] };
  bucket.hits = pruneHits(bucket.hits, now);
  bucket.hits.push(now);
  ipBuckets.set(ip, bucket);

  const next: CookieState = { ...state, [form]: now };
  headers.append("Set-Cookie", await formRateLimitCookie.serialize(next));
}
