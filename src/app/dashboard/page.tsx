import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCohort } from "@/lib/current-cohort";
import PageHeader from "@/components/page-header";
import PhaseStepper from "@/components/phase-stepper";

export const metadata = { title: "Acasă" };

type SubRow = {
    id: string;
    submitted_at: string | null;
    questions: { count: number }[];
};

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .single();

    if (profile?.role === "admin") redirect("/admin");

    const cohort = await getCurrentCohort();

    if (!cohort) {
        return (
            <main className="page">
                <PageHeader title="Niciun laborator deschis">
                    Profesorul nu a pornit încă o sesiune. Revino mai târziu.
                </PageHeader>
            </main>
        );
    }

    const { data: subData } = await supabase
        .from("submissions")
        .select("id, submitted_at, questions(count)")
        .eq("user_id", user!.id)
        .eq("cohort_id", cohort.id)
        .maybeSingle();

    const submission = subData as unknown as SubRow | null;
    const itemCount = submission?.questions?.[0]?.count ?? 0;

    let hasNewFeedback = false;
    if (submission) {
        const { data: fb } = await supabase
            .from("admin_feedback")
            .select("created_at")
            .eq("submission_id", submission.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        hasNewFeedback =
            !!fb &&
            (!submission.submitted_at ||
                new Date(fb.created_at) > new Date(submission.submitted_at));
    }

    const { data: vals } = await supabase
        .from("validations")
        .select("verdict")
        .eq("validator_id", user!.id);

    const total = vals?.length ?? 0;
    const done = (vals ?? []).filter((v) => v.verdict).length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    const m1Closed = !!cohort.m1_closed_at;
    const m2Closed = !!cohort.m2_closed_at;
    const groupsFormed = !!cohort.groups_formed_at;

    return (
        <main className="page">
            <PageHeader title={cohort.name}>
                Aici vezi în ce etapă este laboratorul și ce ai de făcut.
            </PageHeader>

            <section className="card">
                <PhaseStepper cohort={cohort} />
            </section>

            <div className="grid gap-4 sm:grid-cols-2">
                <section className="card card-link flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl">Itemii mei</h2>
                        {hasNewFeedback && <span className="badge">feedback nou</span>}
                    </div>
                    <p className="text-ink-soft">
                        {m1Closed
                            ? "Faza de trimitere s-a încheiat."
                            : submission?.submitted_at
                                ? `Trimis, ${itemCount} ${itemCount === 1 ? "item" : "itemi"}. Poți retrimite până la închiderea fazei.`
                                : "Încă nu ai trimis nimic."}
                    </p>
                    <Link href="/submission" className="btn btn-primary mt-auto self-start">
                        {m1Closed ? "Vezi itemii" : submission?.submitted_at ? "Editează" : "Începe"}
                    </Link>
                </section>

                <section className="card card-link flex flex-col gap-3">
                    <h2 className="text-xl">Validare</h2>
                    {!groupsFormed ? (
                        <p className="text-ink-soft">
                            Începe după ce profesorul formează grupurile. Vei evalua anonim itemii colegilor.
                        </p>
                    ) : total === 0 ? (
                        <p className="text-ink-soft">Nu ți-a fost atribuit niciun item.</p>
                    ) : (
                        <>
                            <p className="text-ink-soft">
                                {done} din {total} itemi evaluați
                                {m2Closed && ", evaluarea s-a încheiat"}.
                            </p>
                            <div className="progress" aria-hidden="true">
                                <div style={{ width: `${pct}%` }} />
                            </div>
                        </>
                    )}
                    {groupsFormed && total > 0 && (
                        <Link href="/validate" className="btn btn-primary mt-auto self-start">
                            {m2Closed ? "Vezi evaluările" : done === total ? "Revizuiește" : "Continuă evaluarea"}
                        </Link>
                    )}
                </section>

                {m2Closed && (
                    <section className="card card-link flex flex-col gap-3 sm:col-span-2">
                        <h2 className="text-xl">Rezultatele testării</h2>
                        <p className="text-ink-soft">
                            Evaluarea s-a încheiat. Descrie ce ai observat când ți-ai testat ipoteza.
                        </p>
                        <Link href="/submission" className="btn btn-primary self-start">
                            Scrie rezultatele
                        </Link>
                    </section>
                )}
            </div>
        </main>
    );
}