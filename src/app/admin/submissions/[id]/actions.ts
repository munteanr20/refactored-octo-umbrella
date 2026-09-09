"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addFeedback(submissionId: string, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const feedbackText = formData.get("feedback_text") as string;

    const { error } = await supabase.from("admin_feedback").insert({
        submission_id: submissionId,
        admin_id: user!.id,
        feedback_text: feedbackText,
    });

    if (error) console.error("addFeedback failed:", error);
    revalidatePath(`/admin/submissions/${submissionId}`);
}