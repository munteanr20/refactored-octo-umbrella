import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-8">
      <h1 className="text-xl font-medium">Dashboard</h1>

      <p className="text-sm text-gray-600">
        Logged in as {user?.email}, role: {profile?.role ?? "unknown"}
      </p>

      {profile?.role === "admin" && (
        <Link href="/admin" className="text-sm underline">
          Go to admin area
        </Link>
      )}

      <form action={logout}>
        <button className="rounded border px-3 py-2 text-sm">Log out</button>
      </form>
    </main>
  );
}
