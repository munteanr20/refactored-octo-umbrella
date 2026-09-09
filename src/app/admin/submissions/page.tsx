import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCohort } from "@/lib/current-cohort";

type SubmissionRow = {
    id: string;
    hypothesis: string | null;
    profiles: { email: string } | null;
};

export default async function AdminSubmissionsPage() {
    const supabase = await createClient();
    const cohort = await getCurrentCohort();

    if (!cohort) {
        return <main className="p-8">No active lab session yet.</main>;
    }

    const { data } = await supabase
        .from("submissions")
        .select("id, hypothesis, profiles(email)")
        .eq("cohort_id", cohort.id);

    const submissions = data as SubmissionRow[] | null;

    return (
        <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
            <h1 className="text-xl font-medium">{cohort.name} — submissions</h1>
            <Link href="/admin/submissions/export" className="text-sm underline">
                Export CSV
            </Link>

            <ul className="flex flex-col gap-2">
                {submissions?.map((s) => (
                    <li key={s.id} className="border rounded p-3">
                        <p className="text-sm text-gray-600">{s.profiles?.email}</p>
                        <p className="truncate">{s.hypothesis || "(no hypothesis yet)"}</p>
                        <Link href={`/admin/submissions/${s.id}`} className="text-sm underline">
                            Review
                        </Link>
                    </li>
                ))}
            </ul>
        </main>
    );
}