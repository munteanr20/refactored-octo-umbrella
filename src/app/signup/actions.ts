"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function isUpbEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return domain === "upb.ro" || domain.endsWith(".upb.ro");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = (formData.get("email") as string).trim();
  const password = formData.get("password") as string;

  if (!isUpbEmail(email)) {
    redirect(
        "/signup?error=" +
        encodeURIComponent("Only upb.ro email addresses can register.")
    );
  }

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/submission");
}