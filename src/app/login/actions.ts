"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function friendly(message: string) {
  if (message.includes("Invalid login credentials")) return "Email sau parolă incorecte.";
  if (message.includes("Email not confirmed")) return "Confirmă adresa de email din mesajul primit.";
  return "Autentificarea nu a reușit. Încearcă din nou.";
}

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(friendly(error.message))}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}