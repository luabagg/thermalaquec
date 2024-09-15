import type { SupabaseClient } from "@supabase/supabase-js";

export const getUser = async function (supabaseClient: SupabaseClient) {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
}
