import { redirect } from '@remix-run/node'
import { createClient } from '~/libs/supabase/client.server'
import type { ActionFunctionArgs } from '@remix-run/node'
import { getUser } from '~/utils/auth'

export const action = async ({ request }: ActionFunctionArgs) => {
    const { supabaseClient, headers } = createClient(request)

    if (await getUser(supabaseClient) === null) {
        return redirect('/admin/login')
    }

    await supabaseClient.auth.signOut()
    return redirect('/', {
        headers,
    })
}