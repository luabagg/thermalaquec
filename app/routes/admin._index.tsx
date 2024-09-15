import { Box, Button } from '@mui/material'
import { redirect } from '@remix-run/node'
import type { LoaderFunctionArgs } from '@remix-run/node'
import { Form } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { Section, SectionTitle } from '~/components/utils/Section'
import { createClient } from '~/libs/supabase/client.server'
import { getUser } from '~/utils/auth'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabaseClient } = createClient(request)

  if (await getUser(supabaseClient) == null) {
      return redirect('/admin/login')
  }

  return new Response(null)
}

export default function AdminPanel() {
  return (
    <>
      <Box className={`
        float-right mr-[20%]
        ${useLogoutIcon() ? '' : 'hidden'}
      `}>
        <Form action="/admin/logout" method="post" className='fixed'>
          <Button type="submit" variant="contained" className='w-12'>Sair</Button>
        </Form>
      </Box>
      <Section>
        <SectionTitle title="Painel" />

      </Section>
    </>
  )
}

function useLogoutIcon(): boolean {
  const [visibleButton, setVisibleButton] = useState(true);

  useEffect(() => {
    const vh80 = document.documentElement.scrollHeight * 0.7;

    const onScroll = () => setVisibleButton(
      document.documentElement.scrollHeight - window.scrollY > vh80
    );
    window.removeEventListener('scroll', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return visibleButton;
}