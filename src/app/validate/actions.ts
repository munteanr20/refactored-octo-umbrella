"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentM2Cohort } from "@/lib/current-cohort";

export async function saveAllValidations(formData: FormData) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const cohort = await getCurrentM2Cohort();
    if (!cohort) {
        redirect(
            "/validate?error=" +
            encodeURIComponent("Validarea nu este deschisă încă.")
        );
    }
    if (cohort.m2_closed_at) {
        redirect(
            "/validate?error=" +
            encodeURIComponent("Evaluarea este închisă, nu mai poți modifica.")
        );
    }

    // RLS already limits this to the caller's own rows; the filters make it explicit
    // and keep it to the current cohort.
    const { data: assigned } = await supabase
        .from("validations")
        .select("id, questions!inner(submissions!inner(cohort_id))")
        .eq("validator_id", user!.id)
        .eq("questions.submissions.cohort_id", cohort.id)
        .order("id");

    type Pending = {
        id: string;
        number: number;
        verdict: "valid" | "invalid";
        rating: number | null;
    };
    const toSave: Pending[] = [];
    const incomplete: number[] = [];

    for (const [idx, v] of (assigned ?? []).entries()) {
        const verdict = formData.get(`verdict_${v.id}`);
        const rating = Number(formData.get(`rating_${v.id}`));

        if (verdict === "invalid") {
            toSave.push({ id: v.id, number: idx + 1, verdict, rating: null });
        } else if (verdict === "valid" && rating >= 1 && rating <= 4) {
            toSave.push({ id: v.id, number: idx + 1, verdict, rating });
        } else {
            incomplete.push(idx + 1);
        }
    }

    // All items are required: if any is incomplete, nothing is saved.
    if (incomplete.length > 0) {
        redirect(
            "/validate?error=" +
            encodeURIComponent(
                `Toți itemii trebuie evaluați. Necompletați: ${incomplete.join(", ")}.`
            )
        );
    }

    const failed: number[] = [];
    for (const p of toSave) {
        const { error } = await supabase
            .from("validations")
            .update({
                verdict: p.verdict,
                rating: p.rating,
                reason_category_id: null,
                reason_text: null,
            })
            .eq("id", p.id);

        if (error) {
            console.error("saveAllValidations failed for item", p.number, error);
            failed.push(p.number);
        }
    }

    revalidatePath("/validate");

    if (failed.length > 0) {
        redirect(
            "/validate?error=" +
            encodeURIComponent(`Itemii ${failed.join(", ")} nu au putut fi salvați.`)
        );
    }

    redirect("/validate?saved=1");
}