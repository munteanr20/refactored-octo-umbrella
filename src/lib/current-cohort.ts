import { createClient } from "@/lib/supabase/server";

export async function getCurrentCohort() {
    const supabase = await createClient();

    const { data } = await supabase
        .from("cohorts")
        .select("id, name, m1_closed_at, groups_formed_at, m2_closed_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return data;
}

export async function getCurrentM2Cohort() {
    const supabase = await createClient();

    const { data } = await supabase
        .from("cohorts")
        .select("id, name, m2_closed_at")
        .not("groups_formed_at", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return data;
}