import { json, redirect } from '@remix-run/node'
import { Form, useActionData } from '@remix-run/react'
import { createClient } from '~/libs/supabase/client.server'
import type { ActionFunctionArgs } from '@remix-run/node'
import { getUser } from '~/utils/auth'
import { Section, SectionContent, SectionTitle } from '~/components/utils/Section'
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material'
import styled from '@emotion/styled'
import config from '~/libs/tailwind/config'
import { useEffect, useState } from 'react'
import { allowedOrigin } from '~/utils/allowedOrigins'

type ActionResponse = {
  success: boolean
  error?: string
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { supabaseClient, headers } = createClient(request)

  if (await getUser(supabaseClient) != null) {
    return redirect('/admin')
  }

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
    console.log(error)
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
      <FormGrid elevation={3} className="p-8 pb-14 flex flex-col md:w-[60%] m-auto">
        <SectionTitle title="Acesso admin" />
        <SectionContent description="">
          {!actionResponse?.success ? (
            <>
              <Box className="sm:mx-10">
                <Typography variant={"h2"} className="pt-2 pb-12">Faça o login abaixo</Typography>

                <Form method="post" onSubmit={handleSubmit}>
                  <Stack spacing={12} direction="column">
                    <TextField
                      type="email"
                      name="email"
                      color="secondary"
                      variant="outlined"
                      className='w-full'
                      placeholder="Seu e-mail"
                      required
                      disabled={isDisabled}
                    />
                    <Button type="submit" variant="contained" className='w-full' disabled={isDisabled}>
                      {isDisabled ? `Obter código (${timer}s)` : 'Obter código'}
                    </Button>
                    {
                      actionResponse?.error != undefined ? (
                        <Alert severity="error">{actionResponse?.error}</Alert>
                      ) : null
                    }
                  </Stack>
                </Form>
              </Box>
            </>
          ) : (
            <Typography variant={"h2"} className="py-8 ">Por favor, verifique seu e-mail</Typography>
          )}
        </SectionContent>
      </FormGrid>
    </Section>
  )
}
