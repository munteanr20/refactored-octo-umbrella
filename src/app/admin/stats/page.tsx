import { getCurrentCohort } from "@/lib/current-cohort";
import { computeCohortReport } from "@/lib/reliability";
import { fmt } from "@/lib/stats";

export default async function AdminStatsPage() {
    const cohort = await getCurrentCohort();

    if (!cohort) {
        return <main className="p-8">Nu există nicio cohortă.</main>;
    }

    const r = await computeCohortReport(cohort.id);

    return (
        <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
            <h1 className="text-xl font-medium">{cohort.name}: statistici</h1>

            <section className="flex flex-col gap-1">
                <h2 className="font-medium">Progres</h2>
                <p>
                    Itemi cu 2 evaluări completate: {r.completedItems} din {r.assignedItems}
                </p>
                {r.underAssignedItems > 0 && (
                    <p className="text-sm text-red-700">
                        {r.underAssignedItems} itemi au mai puțin de 2 validatori atribuiți.
                    </p>
                )}
            </section>

            <section className="flex flex-col gap-1">
                <h2 className="font-medium">Acord pe valid / invalid</h2>
                {r.agreement ? (
                    <>
                        <p>Itemi comparați: {r.agreement.n}</p>
                        <p>Acord brut: {(r.agreement.percentAgreement * 100).toFixed(1)}%</p>
                        <p>κ Fleiss: {fmt(r.agreement.kappa)}</p>
                        <p>AC1 Gwet: {fmt(r.agreement.ac1)}</p>
                        <p>Proporția de „valid”: {(r.agreement.validRate * 100).toFixed(1)}%</p>
                        <p className="text-sm text-gray-600">
                            Dacă aproape toți itemii sunt valizi, κ poate ieși mic chiar și cu
                            acord mare. În acest caz, AC1 și acordul brut sunt mai relevante.
                        </p>
                    </>
                ) : (
                    <p className="text-sm text-gray-600">
                        Nu există încă itemi evaluați de doi validatori.
                    </p>
                )}
            </section>

            <section className="flex flex-col gap-1">
                <h2 className="font-medium">ICC pe notele 1–4</h2>
                {r.icc ? (
                    <>
                        <p>Itemi valizi la ambii validatori: {r.icc.n}</p>
                        <p>ICC(1), un validator: {fmt(r.icc.icc1)}</p>
                        <p>ICC(1,2), media a 2 validatori: {fmt(r.icc.icc1k)}</p>
                        <p className="text-sm text-gray-600">
                            Model one-way, deoarece validatorii diferă de la un item la altul.
                            Se folosesc doar itemii marcați valid de ambii validatori.
                        </p>
                    </>
                ) : (
                    <p className="text-sm text-gray-600">
                        ICC necesită cel puțin 2 itemi valizi la ambii validatori.
                    </p>
                )}
            </section>

            <section className="flex flex-col gap-2">
                <h2 className="font-medium">Cine mai are de evaluat</h2>
                {r.pendingByValidator.length === 0 ? (
                    <p className="text-sm text-gray-600">Toate evaluările sunt completate.</p>
                ) : (
                    <ul className="flex flex-col gap-1 text-sm">
                        {r.pendingByValidator.map((p) => (
                            <li key={p.email}>
                                {p.email}: {p.remaining} rămași
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </main>
    );
}