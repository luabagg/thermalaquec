import { redirect } from '@remix-run/node'
import { createSupabaseServerClient } from '~/libs/supabase/client.server'
import type { ActionFunctionArgs } from '@remix-run/node'

export const loader = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')

  if (code) {
    const { supabaseClient, headers } = createSupabaseServerClient(request)
    const { error } = await supabaseClient.auth.exchangeCodeForSession(code)
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