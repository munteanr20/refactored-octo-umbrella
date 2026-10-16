import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentCohort } from "@/lib/current-cohort";
import PageHeader from "@/components/page-header";
import PhaseStepper from "@/components/phase-stepper";

export const metadata = { title: "Administrare" };

export default async function AdminPage() {
    const supabase = await createClient();
    const cohort = await getCurrentCohort();

    let total = 0;
    let sent = 0;
    if (cohort) {
        const { data } = await supabase
            .from("submissions")
            .select("id, submitted_at")
            .eq("cohort_id", cohort.id);
        total = data?.length ?? 0;
        sent = (data ?? []).filter((s) => s.submitted_at).length;
    }

    const cards = [
        { href: "/admin/cohorts", title: "Cohorte", text: "Creează o cohortă, închide etapele și formează grupurile." },
        { href: "/admin/submissions", title: "Trimiteri", text: "Citește ipotezele și itemii, scrie feedback, exportă CSV." },
        { href: "/admin/stats", title: "Statistici și progres", text: "Acord, κ, AC1, ICC și cine mai are de evaluat." },
    ];

    return (
        <main className="page">
            <PageHeader title="Administrare">
                {cohort
                    ? `${cohort.name}: ${sent} din ${total} studenți au trimis itemii.`
                    : "Nu există nicio cohortă. Creeaz-o din secțiunea Cohorte."}
            </PageHeader>

            {cohort && (
                <section className="card">
                    <PhaseStepper cohort={cohort} />
                </section>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
                {cards.map((c) => (
                    <Link key={c.href} href={c.href} className="card card-link flex flex-col gap-2 no-underline">
                        <h2 className="text-xl">{c.title}</h2>
                        <p className="text-sm text-ink-soft">{c.text}</p>
                    </Link>
                ))}
            </div>
        </main>
    );
}