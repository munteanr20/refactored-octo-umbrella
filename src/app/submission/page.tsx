import { createClient } from "@/lib/supabase/server";
import { getCurrentCohort } from "@/lib/current-cohort";
import PageHeader from "@/components/page-header";
import { saveTestResults } from "./actions";
import SubmissionForm from "./submission-form";

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" });
}

export default async function SubmissionPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
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

    const select = "id, hypothesis_null, hypothesis_alt, test_results, submitted_at";

    let { data: submission } = await supabase
        .from("submissions")
        .select(select)
        .eq("user_id", user!.id)
        .eq("cohort_id", cohort.id)
        .maybeSingle();

    if (!submission) {
        const { data: newSub } = await supabase
            .from("submissions")
            .insert({ user_id: user!.id, cohort_id: cohort.id })
            .select(select)
            .single();
        submission = newSub;
    }

    const { data: questions } = await supabase
        .from("questions")
        .select("id, prompt, category, source_url")
        .eq("submission_id", submission!.id)
        .order("order_index", { ascending: true });

    const { data: feedback } = await supabase
        .from("admin_feedback")
        .select("id, feedback_text, created_at")
        .eq("submission_id", submission!.id)
        .order("created_at", { ascending: false });

    const locked = !!cohort.m1_closed_at;
    const items = questions ?? [];

    const hasNewFeedback =
        !!feedback?.length &&
        (!submission!.submitted_at ||
            new Date(feedback[0].created_at) > new Date(submission!.submitted_at));

    return (
        <main className="page">
            <PageHeader title={cohort.name}>
                {locked
                    ? "Faza de trimitere s-a încheiat. Itemii tăi sunt afișați mai jos."
                    : "Scrie ipoteza și itemii, apoi trimite-le o singură dată. Le poți retrimite oricând până la închiderea fazei."}
            </PageHeader>

            {feedback && feedback.length > 0 && (
                <section className="card card-note flex flex-col gap-3" aria-labelledby="fb">
                    <div className="flex items-center gap-2">
                        <h2 id="fb" className="text-xl">Feedback de la profesor</h2>
                        {hasNewFeedback && <span className="badge">nou</span>}
                    </div>
                    {!locked && (
                        <p className="text-sm text-ink-soft">
                            Aplică modificările în formularul de mai jos și apasă din nou
                            „Trimite itemii”.
                        </p>
                    )}
                    {feedback.map((f) => (
                        <div key={f.id} className="border-l-2 border-line pl-3">
                            <p className="text-xs text-ink-soft">{fmtDate(f.created_at)}</p>
                            <p className="whitespace-pre-wrap">{f.feedback_text}</p>
                        </div>
                    ))}
                </section>
            )}

            <details className="card" open={!submission!.submitted_at}>
                <summary>Ce fel de ipoteză pot formula?</summary>
                <div className="mt-3 flex flex-col gap-2 text-ink-soft">
                    <p>
                        <strong className="text-ink">A.</strong> Modelul X are o rată de acceptare
                        diferită decât Prompt-ul Y la formularea de mesaje de dezinformare.
                    </p>
                    <p>
                        <strong className="text-ink">B.</strong> Prompt-ul X are o rată de
                        acceptare diferită decât Prompt-ul Y la formularea de mesaje de
                        dezinformare de către modelul W.
                    </p>
                    <p>
                        <strong className="text-ink">C.</strong> Dezinformările de tip X au o rată
                        de acceptare diferită decât dezinformările de tip Y în formularea de mesaj
                        de dezinformare de către modelul W.
                    </p>
                </div>
            </details>

            {locked ? (
                <section className="flex flex-col gap-4">
                    <div className="card flex flex-col gap-2">
                        <p><strong>H0:</strong> {submission!.hypothesis_null}</p>
                        <p><strong>H1:</strong> {submission!.hypothesis_alt}</p>
                    </div>
                    <h2 className="text-2xl">Itemi ({items.length}/20)</h2>
                    {items.map((q, idx) => (
                        <div key={q.id} className="card flex flex-col gap-1">
                            <h3 className="text-lg">Item {idx + 1}</h3>
                            {q.source_url && (
                                <a href={q.source_url} target="_blank" rel="noreferrer" className="break-all text-sm underline">
                                    {q.source_url}
                                </a>
                            )}
                            <p className="whitespace-pre-wrap">{q.prompt}</p>
                            <p className="text-sm text-ink-soft">Categorie: {q.category}</p>
                        </div>
                    ))}
                </section>
            ) : (
                <>
                    {submission!.submitted_at && (
                        <p className="text-sm text-ink-soft">
                            Ultima trimitere: {fmtDate(submission!.submitted_at)}
                        </p>
                    )}
                    <SubmissionForm
                        submissionId={submission!.id}
                        initialH0={submission!.hypothesis_null ?? ""}
                        initialH1={submission!.hypothesis_alt ?? ""}
                        initialItems={items.map((q) => ({
                            source_url: q.source_url ?? "",
                            prompt: q.prompt ?? "",
                            category: q.category ?? "",
                        }))}
                    />
                </>
            )}

            {cohort.m2_closed_at && (
                <section className="flex flex-col gap-3">
                    <h2 className="text-2xl">Rezultatele testării ipotezei</h2>
                    <form
                        action={saveTestResults.bind(null, submission!.id)}
                        className="flex flex-col gap-3"
                    >
                        <label htmlFor="test_results" className="text-sm font-semibold">
                            Ce ai observat când ți-ai testat ipoteza?
                        </label>
                        <textarea
                            id="test_results"
                            name="test_results"
                            defaultValue={submission!.test_results ?? ""}
                            rows={6}
                            className="field"
                        />
                        <button className="btn btn-primary self-start">Salvează rezultatele</button>
                    </form>
                </section>
            )}
        </main>
    );
}