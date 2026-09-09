"use server";


import {revalidatePath} from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCohort(formData: FormData) {
    const supabase = await createClient();
    const name = formData.get("name") as string;

    console.log("name from form:", name);

    const { error } = await supabase.from("cohorts").insert({ name });

    if (error) {
        console.error("insert failed:", error);
    }

    revalidatePath("/admin/cohorts");
}

export async function closeM1(cohortId: string) {
    const supabase = await createClient();

    const {error} = await supabase
        .from("cohorts")
        .update({ m1_closed_at: new Date().toISOString() })
        .eq("id", cohortId);

    if (error) {
        console.error("closing M1 failed:", error);
    }

    revalidatePath("/admin/cohorts");
}