import { redirect } from '@remix-run/node'
import { createClient } from '~/libs/supabase/client.server'
import type { ActionFunctionArgs } from '@remix-run/node'

export const loader = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  console.log(code)

  if (code) {
    const { supabaseClient, headers } = createClient(request)
    const { error } = await supabaseClient.auth.exchangeCodeForSession(code)
    console.log(error)
    if (error) {
      return redirect('/admin/login')
    }

    return redirect('/admin', {
      headers,
    })
  }

  return new Response('Erro na autenticação', {
    status: 400,
  })
}