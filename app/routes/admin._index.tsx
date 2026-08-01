import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";

import { redirect } from "@remix-run/node";
import { Form } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { buildNoIndexMeta } from "~/lib/seo";
import { SITE_NAME } from "~/lib/site";
import { createClient } from "~/libs/supabase/client.server";
import { getUser } from "~/utils/auth";

export const meta: MetaFunction = () => buildNoIndexMeta(`Administração | ${SITE_NAME}`);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabaseClient } = createClient(request);

  if ((await getUser(supabaseClient)) == null) {
    return redirect("/admin/login");
  }

  return new Response(null);
};

export default function AdminIndex() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-grow flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Painel admin</h1>
      <p className="text-muted-foreground">Autenticação ativa. Gestão de produtos via Prisma fica para a próxima etapa.</p>
      <Form method="post" action="/admin/logout">
        <Button type="submit" variant="outline">
          Sair
        </Button>
      </Form>
    </main>
  );
}
