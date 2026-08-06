import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createClient } from "~/libs/supabase/client.server";
import { getUser } from "~/utils/auth";

export async function requireAdmin(request: Request) {
  const { supabaseClient, headers } = createClient(request);
  const user = await getUser(supabaseClient);
  if (user == null) {
    throw redirect("/admin/login");
  }
  return { user, supabaseClient, headers };
}

/** Use in loaders that only need the auth gate (no data). */
export async function requireAdminLoader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);
  return null;
}
