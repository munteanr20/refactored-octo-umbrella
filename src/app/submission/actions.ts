"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveHypothesis(submissionId: string, formData: FormData) {
    const supabase = await createClient();
    const hypothesis = formData.get("hypothesis") as string;

    const { error } = await supabase
        .from("submissions")
        .update({ hypothesis })
        .eq("id", submissionId);

    if (error) console.error("saveHypothesis failed:", error);
    revalidatePath("/submission");
}

export async function addQuestion(submissionId: string, nextOrderIndex: number) {
    const supabase = await createClient();

    const { error } = await supabase.from("questions").insert({
        submission_id: submissionId,
        prompt: "",
        category: "",
        choices: ["", "", "", ""],
        order_index: nextOrderIndex,
    });

    if (error) console.error("addQuestion failed:", error);
    revalidatePath("/submission");
}

export async function saveQuestion(questionId: string, formData: FormData) {
    const supabase = await createClient();

    const choices = [0, 1, 2, 3].map((i) => formData.get(`choice${i}`) as string);

    const { error } = await supabase
        .from("questions")
        .update({
            prompt: formData.get("prompt") as string,
            category: formData.get("category") as string,
            choices,
            correct_choice_index: Number(formData.get("correct_choice_index")),
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