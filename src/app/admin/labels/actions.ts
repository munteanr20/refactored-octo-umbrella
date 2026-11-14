"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function back(cohortId: string, key: "error" | "saved", value: string): never {
    redirect(`/admin/labels?cohort=${cohortId}&${key}=${encodeURIComponent(value)}`);
}

export async function fillMissingEvaluations(cohortId: string, formData: FormData) {
    const supabase = await createClient();

    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin !== true) redirect("/dashboard");

    const { data: cohort } = await supabase
        .from("cohorts")
        .select("m2_closed_at, results_released_at")
        .eq("id", cohortId)
        .single();

    if (!cohort?.m2_closed_at) back(cohortId, "error", "Închide mai întâi validarea.");
    if (cohort.results_released_at) back(cohortId, "error", "Rezultatele au fost deja publicate.");

    const ids = [...formData.keys()]
        .filter((k) => k.startsWith("verdict_"))
        .map((k) => k.slice("verdict_".length));

    if (ids.length === 0) back(cohortId, "error", "Nu există nimic de salvat.");

    const toSave: { id: string; verdict: "valid" | "invalid"; rating: number | null }[] = [];
    for (const id of ids) {
        const verdict = formData.get(`verdict_${id}`);
        const rating = Number(formData.get(`rating_${id}`));

        if (verdict === "invalid") {
            toSave.push({ id, verdict, rating: null });
        } else if (verdict === "valid" && rating >= 1 && rating <= 4) {
            toSave.push({ id, verdict, rating });
        } else {
            back(cohortId, "error", "Toate evaluările de pe pagină trebuie completate.");
        }
    }

    let failed = 0;
    for (const p of toSave) {
        // only rows nobody has answered yet; staff rows are flagged
        const { error } = await supabase
            .from("validations")
            .update({
                verdict: p.verdict,
                rating: p.rating,
                filled_by_admin: true,
                reason_category_id: null,
                reason_text: null,
            })
            .eq("id", p.id)
            .is("verdict", null);

        if (error) {
            console.error("fillMissingEvaluations failed for", p.id, error);
            failed++;
        }
    }

    revalidatePath("/admin/labels");
    revalidatePath("/admin/stats");
    revalidatePath("/admin/cohorts");

    if (failed > 0) back(cohortId, "error", `${failed} evaluări nu au putut fi salvate.`);
    back(cohortId, "saved", "1");
}