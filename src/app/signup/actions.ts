"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function isUpbEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return domain === "upb.ro" || domain.endsWith(".upb.ro");
}

function friendly(message: string) {
  if (message.includes("already registered")) return "Există deja un cont cu acest email.";
  if (message.toLowerCase().includes("password")) return "Parola nu este acceptată (minim 6 caractere).";
  return "Contul nu a putut fi creat. Încearcă din nou.";
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!isUpbEmail(email)) {
    redirect(
        "/signup?error=" +
        encodeURIComponent("Doar adresele de email upb.ro pot crea cont.")
    );
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(friendly(error.message))}`);
  }

  // With email confirmation on, there is no session until the link is clicked.
  if (!data.session) {
    redirect(
        "/login?message=" +
        encodeURIComponent("Cont creat. Verifică emailul și confirmă adresa, apoi autentifică-te.")
    );
  }

  revalidatePath("/", "layout");
  redirect("/submission");
}