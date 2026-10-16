"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateSubmission, type ItemInput } from "@/lib/submission-rules";

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitSubmission(
    submissionId: string,
    h0: string,
    h1: string,
    items: ItemInput[]
): Promise<SubmitResult> {
    const clean: ItemInput[] = items.map((it) => ({
        source_url: String(it.source_url ?? "").trim(),
        prompt: String(it.prompt ?? "").trim(),
        category: String(it.category ?? "").trim(),
    }));

    const errors = validateSubmission(String(h0 ?? "").trim(), String(h1 ?? "").trim(), clean);
    if (errors.length > 0) {
        return { ok: false, error: errors[0].message };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("save_submission", {
        p_submission_id: submissionId,
        p_h0: String(h0).trim(),
        p_h1: String(h1).trim(),
        p_items: clean,
    });

    if (error) {
        console.error("save_submission failed:", error);
        if (error.message.includes("locked")) {
            return { ok: false, error: "Faza de trimitere s-a închis." };
        }
        if (error.message.includes("not_allowed")) {
            return { ok: false, error: "Nu ai voie să modifici această trimitere." };
        }
        return { ok: false, error: "Nu s-a putut salva. Încearcă din nou." };
    }

    revalidatePath("/submission");
    return { ok: true };
}

export async function saveTestResults(submissionId: string, formData: FormData) {
    const supabase = await createClient();
    const testResults = formData.get("test_results") as string;

    const { error } = await supabase
        .from("submissions")
        .update({ test_results: testResults })
        .eq("id", submissionId);

    if (error) console.error("saveTestResults failed:", error);
    revalidatePath("/submission");
}