import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCohort } from "@/lib/current-cohort";
import PageHeader from "@/components/page-header";

export const metadata = { title: "Trimiteri" };

type SubmissionRow = {
    id: string;
    hypothesis_null: string | null;
    submitted_at: string | null;
    profiles: { email: string } | null;
    questions: { count: number }[];
};

export default async function AdminSubmissionsPage() {
    const supabase = await createClient();
    const cohort = await getCurrentCohort();

    if (!cohort) {
        return (
            <main className="page">
                <PageHeader title="Trimiteri">Nu există nicio cohortă.</PageHeader>
            </main>
        );
    }

    const { data } = await supabase
        .from("submissions")
        .select("id, hypothesis_null, submitted_at, profiles(email), questions(count)")
        .eq("cohort_id", cohort.id)
        .order("submitted_at", { ascending: false, nullsFirst: false });

    const submissions = data as unknown as SubmissionRow[] | null;
    const sent = (submissions ?? []).filter((s) => s.submitted_at).length;

    return (
        <main className="page">
            <PageHeader title={`${cohort.name}: trimiteri`}>
                {sent} din {submissions?.length ?? 0} studenți au trimis itemii.
            </PageHeader>

            <div className="flex flex-wrap gap-2">
                <Link href="/admin/submissions/export-items" className="btn">Exportă itemii (CSV)</Link>
                <Link href="/admin/submissions/export-validations" className="btn">Exportă evaluările (CSV)</Link>
            </div>

            {submissions?.length === 0 && (
                <p className="card text-ink-soft">Niciun student nu s-a înscris încă în această cohortă.</p>
            )}

            <ul className="flex flex-col gap-3">
                {submissions?.map((s) => {
                    const count = s.questions?.[0]?.count ?? 0;
                    return (
                        <li key={s.id}>
                            <Link href={`/admin/submissions/${s.id}`} className="card card-link flex flex-col gap-1 no-underline">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-sm text-ink-soft">{s.profiles?.email}</p>
                                    {s.submitted_at ? (
                                        <span className="badge badge-ok">{count} itemi</span>
                                    ) : (
                                        <span className="badge badge-mute">netrimis</span>
                                    )}
                                </div>
                                <p className="line-clamp-2">
                                    {s.hypothesis_null || "Fără ipoteză încă"}
                                </p>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </main>
    );
}