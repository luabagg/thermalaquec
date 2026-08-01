import { json, redirect } from "@remix-run/node";
import { Form, useActionData } from "@remix-run/react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Button, Input } from "@heroui/react";
import { useEffect, useState } from "react";
import { Section, SectionContent, SectionTitle } from "~/components/ui/Section";
import Typography from "~/components/ui/Typography";
import { createClient } from "~/libs/supabase/client.server";
import { getUser } from "~/utils/auth";
import { allowedOrigin } from "~/utils/allowedOrigins";

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

  const origin = request.headers.get("origin")!;
  if (process.env.NODE_ENV === "production" && allowedOrigin(origin)) {
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
      emailRedirectTo: origin + "/admin/login/callback",
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
    <Section>
      <div className="px-4 pt-14 pb-24 flex flex-col w-[90%] md:w-[40%] m-auto rounded-md bg-slate-dark-500 shadow-inset-clean">
        <SectionTitle title="Acesso admin" />
        <SectionContent description="">
          {!actionResponse?.success ? (
            <>
              <Typography variant="h2" className="pt-8 pb-14">
                Faça o login abaixo
              </Typography>

              <Form method="post" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-6">
                  <Input
                    type="email"
                    name="email"
                    variant="underlined"
                    placeholder="Seu e-mail"
                    className="md:w-[90%]"
                    isRequired
                    isDisabled={isDisabled}
                  />
                  <Button
                    type="submit"
                    color="primary"
                    className="md:w-[90%] font-semibold h-[54px]"
                    isDisabled={isDisabled}
                  >
                    {isDisabled ? `Obter código (${timer}s)` : "Obter código"}
                  </Button>
                  {actionResponse?.error != undefined ? (
                    <div
                      role="alert"
                      className="rounded-md border border-red-dark bg-red-dark/20 px-4 py-2 text-sm text-white"
                    >
                      {actionResponse.error}
                    </div>
                  ) : null}
                </div>
              </Form>
            </>
          ) : (
            <Typography variant="h2" className="py-8">
              Por favor, verifique seu e-mail
            </Typography>
          )}
        </SectionContent>
      </div>
    </Section>
  );
}
