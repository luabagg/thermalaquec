import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { createClient } from "~/libs/supabase/client.server";
import { allowedOrigin } from "~/utils/allowedOrigins";
import { getUser } from "~/utils/auth";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabaseClient } = createClient(request);

  if ((await getUser(supabaseClient)) != null) {
    return redirect("/admin");
  }

  return new Response(null);
};

type ActionResponse = {
  success: boolean;
  error?: string;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { supabaseClient, headers } = createClient(request);

  const origin = request.headers.get("origin");
  if (
    process.env.NODE_ENV === "production" &&
    (!origin || !allowedOrigin(origin))
  ) {
    return json<ActionResponse>(
      {
        success: false,
        error: "Problema ao confirmar origem do domínio",
      },
      { headers },
    );
  }

  const formData = await request.formData();
  const { error } = await supabaseClient.auth.signInWithOtp({
    email: formData.get("email") as string,
    options: {
      emailRedirectTo: `${origin}/admin/login/callback`,
    },
  });

  if (error) {
    return json<ActionResponse>(
      {
        success: false,
        error: "Erro ao efetuar login",
      },
      { headers },
    );
  }

  return json<ActionResponse>({ success: true }, { headers });
};

export default function LoginPage() {
  const actionResponse = useActionData<typeof action>();
  const [isDisabled, setIsDisabled] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isDisabled) {
      setTimer(30);
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev === 1) {
            clearInterval(interval);
            setIsDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isDisabled]);

  const handleSubmit = () => {
    setIsDisabled(true);
  };

  return (
    <main className="flex flex-grow items-center justify-center bg-secondary px-4 py-16">
      <div className="w-full max-w-md rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">Acesso admin</h1>
        {!actionResponse?.success ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Faça o login com seu e-mail. Enviaremos um link de acesso.
            </p>
            <Form method="post" onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Seu e-mail"
                  required
                  disabled={isDisabled}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isDisabled}>
                {isDisabled ? `Obter código (${timer}s)` : "Obter código"}
              </Button>
              {actionResponse?.error != undefined ? (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive"
                >
                  {actionResponse.error}
                </div>
              ) : null}
            </Form>
          </>
        ) : (
          <p className="mt-6 text-lg font-medium">Por favor, verifique seu e-mail</p>
        )}
      </div>
    </main>
  );
}
