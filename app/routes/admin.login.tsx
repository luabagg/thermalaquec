import { json, redirect } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { createClient } from '~/libs/supabase/client.server'
import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { getUser } from '~/utils/auth'
import { Section, SectionContent, SectionTitle } from '~/components/utils/Section'
import { Alert, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import styled from '@emotion/styled'
import config from '~/libs/tailwind/config'
import { useEffect, useState } from 'react'
import { allowedOrigin } from '~/utils/allowedOrigins'


export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabaseClient } = createClient(request)

  if (await getUser(supabaseClient) != null) {
    return redirect('/admin')
  }

  return new Response(null)
}

type ActionResponse = {
  success: boolean
  error?: string
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { supabaseClient, headers } = createClient(request)

  const origin = request.headers.get('origin')!
  if (process.env.NODE_ENV === 'production' && allowedOrigin(origin)) {
    return json<ActionResponse>(
      {
        success: false,
        error: "Problema ao confirmar origem do domínio"
      },
      { headers }
    )
  }

  const formData = await request.formData()
  const { error } = await supabaseClient.auth.signInWithOtp({
    email: formData.get('email') as string,
    options: {
      emailRedirectTo: origin + '/admin/login/callback',
    },
  })

  if (error) {
    return json<ActionResponse>(
      {
        success: false,
        error: "Erro ao efetuar login"
      },
      { headers }
    )
  }

  return json<ActionResponse>({ success: true }, { headers })
}

const FormGrid = styled(Paper)(({ theme }) => ({
  backgroundColor: config.theme.colors['slate-dark'][500],
}));

export default function LoginPage() {
  const actionResponse = useActionData<typeof action>()
  const [isDisabled, setIsDisabled] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
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
      <FormGrid elevation={1} className="px-4 pt-14 pb-24 flex flex-col w-[90%] md:w-[40%] m-auto">
        <SectionTitle title="Acesso admin" />
        <SectionContent description="">
          {!actionResponse?.success ? (
            <>
              <Typography variant={"h2"} className="pt-8 pb-14">Faça o login abaixo</Typography>

              <Form method="post" onSubmit={handleSubmit}>
                <Stack spacing={6} direction="column">
                  <TextField
                    type="email"
                    name="email"
                    color="secondary"
                    variant="standard"
                    placeholder="Seu e-mail"
                    className='md:w-[90%]'
                    required
                    disabled={isDisabled}
                  />
                  <Button type="submit" variant="contained" sx={{fontWeight:600, height: 54}} className='md:w-[90%]' disabled={isDisabled}>
                    {isDisabled ? `Obter código (${timer}s)` : 'Obter código'}
                  </Button>
                  {
                    actionResponse?.error != undefined ? (
                      <Alert severity="error">{actionResponse?.error}</Alert>
                    ) : null
                  }
                </Stack>
              </Form>
            </>
          ) : (
            <Typography variant={"h2"} className="py-8 ">Por favor, verifique seu e-mail</Typography>
          )}
        </SectionContent>
      </FormGrid>
    </Section>
  )
}
