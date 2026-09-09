import { createClient } from "@/lib/supabase/server";

export async function getCurrentCohort() {
    const supabase = await createClient();

    const { data } = await supabase
        .from("cohorts")
        .select("id, name, m1_closed_at")
        .is("m1_closed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return data;
}