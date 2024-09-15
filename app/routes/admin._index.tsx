import { redirect } from '@remix-run/node'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { Form } from '@remix-run/react'
import { createSupabaseServerClient } from '~/libs/supabase/client.server'
import { getUser } from '~/utils/auth'

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { supabaseClient } = createSupabaseServerClient(request)

    if (await getUser(supabaseClient) == null) {
      return redirect('/admin')
    }

    return new Response(null)
}

export default function AdminPanel() {
    return (
        <div>
            <h1>Admin Panel</h1>
            <Form action="/admin/logout" method="post">
                <button type="submit">Sair</button>
            </Form>
        </div>
    )
}
