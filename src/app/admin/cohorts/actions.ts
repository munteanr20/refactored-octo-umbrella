"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCohort(formData: FormData) {
    const supabase = await createClient();
    const name = formData.get("name") as string;

    const { error } = await supabase.from("cohorts").insert({ name });
    if (error) console.error("createCohort failed:", error);

    revalidatePath("/admin/cohorts");
}

export async function closeM1(cohortId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("cohorts")
        .update({ m1_closed_at: new Date().toISOString() })
        .eq("id", cohortId);
    if (error) console.error("closeM1 failed:", error);

    revalidatePath("/admin/cohorts");
}

export async function closeM2(cohortId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("cohorts")
        .update({ m2_closed_at: new Date().toISOString() })
        .eq("id", cohortId);
    if (error) console.error("closeM2 failed:", error);

    revalidatePath("/admin/cohorts");
}

export async function formGroups(cohortId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: cohort } = await supabase
        .from("cohorts")
        .select("m1_closed_at, groups_formed_at")
        .eq("id", cohortId)
        .single();

    if (!cohort?.m1_closed_at || cohort.groups_formed_at) {
        console.error("formGroups: cohort not ready, or already grouped");
        return;
    }

    const { data: submissions, error: subError } = await supabase
        .from("submissions")
        .select("user_id, questions(id)")
        .eq("cohort_id", cohortId);

    if (subError) {
        console.error("formGroups: failed to load submissions", subError);
        return;
    }
    if (!submissions || submissions.length === 0) {
        console.error("formGroups: no submissions to group");
        return;
    }

    type Student = { user_id: string; questions: { id: string }[] };

    const { data: admins } = await supabase.from("profiles").select("id").eq("role", "admin");
    const adminIds = new Set((admins ?? []).map((a) => a.id));

    const shuffled = (submissions as Student[])
        .filter((s) => !adminIds.has(s.user_id))
        .sort(() => Math.random() - 0.5);

    const n = shuffled.length;
    const remainder = n % 3;
    const mainCount = n - remainder;

    const trios: Student[][] = [];
    for (let i = 0; i < mainCount; i += 3) {
        trios.push(shuffled.slice(i, i + 3));
    }

    const pair = remainder === 2 ? shuffled.slice(mainCount) : null;
    const lone = remainder === 1 ? shuffled[n - 1] : null;

    const groupRows: { group_id: string; user_id: string }[] = [];
    const validationRows: { question_id: string; validator_id: string }[] = [];

    for (const trio of trios) {
        const { data: group } = await supabase
            .from("groups")
            .insert({ cohort_id: cohortId })
            .select("id")
            .single();
        if (!group) continue;

        for (const member of trio) {
            groupRows.push({ group_id: group.id, user_id: member.user_id });
            const peers = trio.filter((m) => m.user_id !== member.user_id);
            for (const q of member.questions) {
                for (const peer of peers) {
                    validationRows.push({ question_id: q.id, validator_id: peer.user_id });
                }
            }
        }
    }

    if (pair) {
        const { data: group } = await supabase
            .from("groups")
            .insert({ cohort_id: cohortId })
            .select("id")
            .single();

        if (group) {
            const [d, e] = pair;
            // Third validator: first member of the first trio, or the admin if there are no trios.
            const borrowed = trios[0]?.[0]?.user_id ?? user!.id;

            groupRows.push({ group_id: group.id, user_id: d.user_id });
            groupRows.push({ group_id: group.id, user_id: e.user_id });

            for (const q of d.questions) {
                validationRows.push({ question_id: q.id, validator_id: e.user_id });
                validationRows.push({ question_id: q.id, validator_id: borrowed });
            }
            for (const q of e.questions) {
                validationRows.push({ question_id: q.id, validator_id: d.user_id });
                validationRows.push({ question_id: q.id, validator_id: borrowed });
            }
        }
    }

    if (lone) {
        const { data: group } = await supabase
            .from("groups")
            .insert({ cohort_id: cohortId })
            .select("id")
            .single();

        if (group) {
            groupRows.push({ group_id: group.id, user_id: lone.user_id });

            // Second validator: a random classmate (never the lone student), if any exist.
            const others = shuffled.filter((s) => s.user_id !== lone.user_id);
            const borrowed =
                others.length > 0
                    ? others[Math.floor(Math.random() * others.length)].user_id
                    : null;

            for (const q of lone.questions) {
                validationRows.push({ question_id: q.id, validator_id: user!.id });
                if (borrowed) {
                    validationRows.push({ question_id: q.id, validator_id: borrowed });
                }
            }
        }
    }

    if (groupRows.length > 0) {
        const { error } = await supabase.from("group_members").insert(groupRows);
        if (error) console.error("formGroups: group_members insert failed", error);
    }

    if (validationRows.length > 0) {
        const { error } = await supabase.from("validations").insert(validationRows);
        if (error) console.error("formGroups: validations insert failed", error);
    }

    await supabase
        .from("cohorts")
        .update({ groups_formed_at: new Date().toISOString() })
        .eq("id", cohortId);

    revalidatePath("/admin/cohorts");
}