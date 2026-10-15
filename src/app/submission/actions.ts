"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const MAX_ITEMS = 20;

export async function saveHypothesis(submissionId: string, formData: FormData) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("submissions")
        .update({
            hypothesis_null: formData.get("hypothesis_null") as string,
            hypothesis_alt: formData.get("hypothesis_alt") as string,
        })
        .eq("id", submissionId);

    if (error) console.error("saveHypothesis failed:", error);
    revalidatePath("/submission");
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

function isEuvsdisinfoUrl(raw: string) {
    try {
        const host = new URL(raw).hostname.toLowerCase();
        return host === "euvsdisinfo.eu" || host.endsWith(".euvsdisinfo.eu");
    } catch {
        return false;
    }
}

export async function addQuestion(submissionId: string, nextOrderIndex: number) {
    const supabase = await createClient();

    const { count } = await supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("submission_id", submissionId);

    if ((count ?? 0) >= MAX_ITEMS) return;

    const { error } = await supabase.from("questions").insert({
        submission_id: submissionId,
        prompt: "",
        category: "",
        source_url: "",
        order_index: nextOrderIndex,
    });

    if (error) console.error("addQuestion failed:", error);
    revalidatePath("/submission");
}

export async function saveQuestion(questionId: string, formData: FormData) {
    const supabase = await createClient();

    const sourceUrl = ((formData.get("source_url") as string) ?? "").trim();

    if (sourceUrl && !isEuvsdisinfoUrl(sourceUrl)) {
        redirect(
            "/submission?error=" +
            encodeURIComponent("The link must point to euvsdisinfo.eu.")
        );
    }

    const { error } = await supabase
        .from("questions")
        .update({
            source_url: sourceUrl || null,
            prompt: formData.get("prompt") as string,
            category: formData.get("category") as string,
        })
        .eq("id", questionId);

    if (error) console.error("saveQuestion failed:", error);
    revalidatePath("/submission");
}

export async function deleteQuestion(questionId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("questions").delete().eq("id", questionId);

    if (error) console.error("deleteQuestion failed:", error);
    revalidatePath("/submission");
}