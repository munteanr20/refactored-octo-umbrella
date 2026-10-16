import Link from "next/link";
import { getCurrentCohort } from "@/lib/current-cohort";
import { computeCohortReport } from "@/lib/reliability";
import { fmt } from "@/lib/stats";
import PageHeader from "@/components/page-header";

export const metadata = { title: "Statistici" };

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
    return (
        <div className="card flex flex-col gap-1">
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="font-display text-3xl">{value}</p>
            {note && <p className="text-xs text-ink-soft">{note}</p>}
        </div>
    );
}

export default async function AdminStatsPage() {
    const cohort = await getCurrentCohort();

    if (!cohort) {
        return (
            <main className="page">
                <PageHeader title="Statistici">Nu există nicio cohortă.</PageHeader>
            </main>
        );
    }

    const r = await computeCohortReport(cohort.id);
    const pct = r.assignedItems ? Math.round((r.completedItems / r.assignedItems) * 100) : 0;

    return (
        <main className="page">
            <PageHeader title={`${cohort.name}: statistici`}>
                Valorile se actualizează pe măsură ce studenții își termină evaluările.
            </PageHeader>

            <div className="flex flex-wrap gap-2">
                <Link href="/admin/submissions/export-items" className="btn">Exportă itemii (CSV)</Link>
                <Link href="/admin/submissions/export-validations" className="btn">Exportă evaluările (CSV)</Link>
            </div>

            <section className="flex flex-col gap-3">
                <h2 className="text-2xl">Progres</h2>
                <div className="card flex flex-col gap-3">
                    <p>
                        Itemi cu 2 evaluări completate: <strong>{r.completedItems}</strong> din {r.assignedItems}
                    </p>
                    <div className="progress" aria-hidden="true"><div style={{ width: `${pct}%` }} /></div>
                    {r.underAssignedItems > 0 && (
                        <p role="alert" className="alert alert-error">
                            {r.underAssignedItems} itemi au mai puțin de 2 validatori atribuiți.
                        </p>
                    )}
                </div>
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="text-2xl">Acord pe valid / invalid</h2>
                {r.agreement ? (
                    <>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Tile label="Acord brut" value={`${(r.agreement.percentAgreement * 100).toFixed(1)}%`} note={`${r.agreement.n} itemi comparați`} />
                            <Tile label="κ Fleiss" value={fmt(r.agreement.kappa)} />
                            <Tile label="AC1 Gwet" value={fmt(r.agreement.ac1)} />
                            <Tile label="Proporția „valid”" value={`${(r.agreement.validRate * 100).toFixed(1)}%`} />
                        </div>
                        <p className="text-sm text-ink-soft">
                            Dacă aproape toți itemii sunt valizi, κ poate ieși mic chiar și cu acord
                            mare. În acest caz, AC1 și acordul brut sunt mai relevante.
                        </p>
                    </>
                ) : (
                    <p className="card text-ink-soft">Nu există încă itemi evaluați de doi validatori.</p>
                )}
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="text-2xl">ICC pe notele 1–4</h2>
                {r.icc ? (
                    <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Tile label="ICC(1), un validator" value={fmt(r.icc.icc1)} />
                            <Tile label="ICC(1,2), media a 2" value={fmt(r.icc.icc1k)} />
                            <Tile label="Itemi folosiți" value={String(r.icc.n)} note="valizi la ambii validatori" />
                        </div>
                        <p className="text-sm text-ink-soft">
                            Model one-way, deoarece validatorii diferă de la un item la altul. Se
                            folosesc doar itemii marcați valid de ambii validatori.
                        </p>
                    </>
                ) : (
                    <p className="card text-ink-soft">
                        ICC necesită cel puțin 2 itemi valizi la ambii validatori.
                    </p>
                )}
            </section>

            <section className="flex flex-col gap-3">
                <h2 className="text-2xl">Cine mai are de evaluat</h2>
                {r.pendingByValidator.length === 0 ? (
                    <p className="card text-ink-soft">Toate evaluările sunt completate.</p>
                ) : (
                    <ul className="card flex flex-col divide-y divide-line">
                        {r.pendingByValidator.map((p) => (
                            <li key={p.email} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                                <span className="truncate">{p.email}</span>
                                <span className="badge">{p.remaining} rămași</span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}