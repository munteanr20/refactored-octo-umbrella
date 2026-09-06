"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // The public.profiles row is created automatically by the
  // on_auth_user_created trigger (see supabase/migrations/0001_init.sql).
  redirect(
    "/login?message=" +
      encodeURIComponent(
        "Check your email to confirm your account, then log in."
      )
  );
}
