import { createClient } from "@/lib/supabase/server";

const COHORT_FIELDS =
    "id, name, m1_closed_at, groups_formed_at, m2_closed_at, results_released_at";

export async function getCurrentCohort() {
    const supabase = await createClient();

    const { data } = await supabase
        .from("cohorts")
        .select(COHORT_FIELDS)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    return data;
}

export async function getCurrentM2Cohort() {
    const cohort = await getCurrentCohort();
    return cohort?.groups_formed_at ? cohort : null;
}

export async function getCohortForAdmin(cohortId?: string | null) {
    if (cohortId) {
        const supabase = await createClient();
        const { data } = await supabase
            .from("cohorts")
            .select(COHORT_FIELDS)
            .eq("id", cohortId)
            .maybeSingle();
        if (data) return data;
    }
    return getCurrentCohort();
}

export async function listCohorts() {
    const supabase = await createClient();
    const { data } = await supabase
        .from("cohorts")
        .select("id, name")
        .order("created_at", { ascending: false });
    return data ?? [];
}