import { useRevalidator } from "@remix-run/react";
import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";

import type { Session, SupabaseClient } from "@supabase/supabase-js";

export type SupabaseOutletContext = {
  supabase: SupabaseClient;
  domainUrl: string;
};

export const useSupabase = ({ serverSession }: { serverSession: Session | null }) => {
  const [supabase] = useState(() =>
    createBrowserClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
  );
  const serverAccessToken = serverSession?.access_token;
  const revalidator = useRevalidator();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token !== serverAccessToken) {
        // Revalidate the app.
        revalidator.revalidate();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, serverAccessToken, revalidator]);

  return { supabase };
}