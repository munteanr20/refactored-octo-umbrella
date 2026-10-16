import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/page-header";
import PhaseStepper from "@/components/phase-stepper";
import ConfirmButton from "@/components/confirm-button";
import SubmitButton from "@/components/submit-button";
import { createCohort, closeM1, closeM2, formGroups } from "./actions";

export const metadata = { title: "Cohorte" };

export default async function AdminCohortsPage() {
    const supabase = await createClient();

    const { data: cohorts } = await supabase
        .from("cohorts")
        .select("id, name, m1_closed_at, m2_closed_at, groups_formed_at")
        .order("created_at", { ascending: false });

    return (
        <main className="page">
            <PageHeader title="Cohorte">
                Aplicația lucrează cu cea mai nouă cohortă. Etapele se închid în ordine și nu pot fi redeschise.
            </PageHeader>

            <ul className="flex flex-col gap-4">
                {cohorts?.length === 0 && (
                    <li className="card text-ink-soft">Nu există nicio cohortă încă. Creeaz-o mai jos.</li>
                )}

                {cohorts?.map((c, i) => (
                    <li key={c.id} className="card flex flex-col gap-5">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl">{c.name}</h2>
                            {i === 0 && <span className="badge">activă</span>}
                        </div>

                        <PhaseStepper cohort={c} />

                        <div className="flex flex-wrap gap-2">
                            {!c.m1_closed_at && (
                                <form action={closeM1.bind(null, c.id)}>
                                    <ConfirmButton message="Închizi trimiterea itemilor? Studenții nu vor mai putea modifica nimic.">
                                        Închide trimiterea itemilor
                                    </ConfirmButton>
                                </form>
                            )}
                            {c.m1_closed_at && !c.groups_formed_at && (
                                <form action={formGroups.bind(null, c.id)}>
                                    <ConfirmButton
                                        className="btn btn-primary"
                                        message="Formezi grupurile acum? Atribuirea este aleatorie și nu se poate anula."
                                    >
                                        Formează grupurile
                                    </ConfirmButton>
                                </form>
                            )}
                            {c.groups_formed_at && !c.m2_closed_at && (
                                <form action={closeM2.bind(null, c.id)}>
                                    <ConfirmButton message="Închizi validarea? Evaluările nu vor mai putea fi modificate.">
                                        Închide validarea
                                    </ConfirmButton>
                                </form>
                            )}
                            {c.m2_closed_at && (
                                <p className="text-sm text-ink-soft">Toate etapele sunt încheiate.</p>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            <section className="card flex flex-col gap-3">
                <h2 className="text-xl">Cohortă nouă</h2>
                <form action={createCohort} className="flex flex-col gap-3">
                    <label htmlFor="name" className="text-sm font-semibold">Numele cohortei</label>
                    <input
                        id="name"
                        name="name"
                        required
                        placeholder="Statistică aplicată 2026–27"
                        className="field"
                    />
                    <SubmitButton pendingLabel="Se creează..." className="btn btn-primary self-start">
                        Creează cohorta
                    </SubmitButton>
                </form>
            </section>
        </main>
    );
}