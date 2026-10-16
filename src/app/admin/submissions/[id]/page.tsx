import { createClient } from "@/lib/supabase/server";
import { computeSubmissionReliability } from "@/lib/reliability";
import { fmt } from "@/lib/stats";
import PageHeader from "@/components/page-header";
import FeedbackForm from "./feedback-form";

type SubmissionDetail = {
    id: string;
    hypothesis_null: string | null;
    hypothesis_alt: string | null;
    test_results: string | null;
    submitted_at: string | null;
    profiles: { email: string } | null;
};

type ItemRow = {
    id: string;
    prompt: string | null;
    category: string | null;
    source_url: string | null;
    validations: { verdict: string | null; rating: number | null }[];
};

function fmtDate(iso: string) {
    return new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" });
}

function VerdictChip({ v }: { v: { verdict: string | null; rating: number | null } }) {
    if (v.verdict === "valid") return <span className="badge badge-ok">valid · {v.rating}</span>;
    if (v.verdict === "invalid") return <span className="badge badge-bad">invalid</span>;
    return <span className="badge badge-mute">în așteptare</span>;
}

export default async function SubmissionDetailPage({
                                                       params,
                                                   }: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const { data } = await supabase
        .from("submissions")
        .select("id, hypothesis_null, hypothesis_alt, test_results, submitted_at, profiles(email)")
        .eq("id", id)
        .single();

    const submission = data as unknown as SubmissionDetail | null;

    const { data: itemsData } = await supabase
        .from("questions")
        .select("id, prompt, category, source_url, order_index, validations(verdict, rating)")
        .eq("submission_id", id)
        .order("order_index", { ascending: true });

    const items = itemsData as unknown as ItemRow[] | null;

    const { data: feedback } = await supabase
        .from("admin_feedback")
        .select("id, feedback_text, created_at")
        .eq("submission_id", id)
        .order("created_at", { ascending: false });

    const reliability = await computeSubmissionReliability(id);

    return (
        <main className="page">
            <PageHeader title={submission?.profiles?.email ?? "Trimitere"}>
                {submission?.submitted_at
                    ? `Ultima trimitere: ${fmtDate(submission.submitted_at)}`
                    : "Netrimis încă"}
            </PageHeader>

            <section className="card flex flex-col gap-2">
                <h2 className="text-xl">Ipoteza</h2>
                <p><strong>H0:</strong> {submission?.hypothesis_null}</p>
                <p><strong>H1:</strong> {submission?.hypothesis_alt}</p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="text-2xl">Itemi ({items?.length ?? 0}/20)</h2>
                {items?.map((q, idx) => (
                    <div key={q.id} className="card flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-lg">Item {idx + 1}</h3>
                            {q.category && <span className="badge badge-mute">{q.category}</span>}
                        </div>
                        {q.source_url && (
                            <a href={q.source_url} target="_blank" rel="noreferrer" className="break-all text-sm underline">
                                {q.source_url}
                            </a>
                        )}
                        <p className="whitespace-pre-wrap">{q.prompt}</p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                            <span className="text-sm text-ink-soft">Evaluări:</span>
                            {q.validations.length === 0 ? (
                                <span className="badge badge-mute">nimic atribuit</span>
                            ) : (
                                q.validations.map((v, i) => <VerdictChip key={i} v={v} />)
                            )}
                        </div>
                    </div>
                ))}
            </section>

            {submission?.test_results && (
                <section className="card flex flex-col gap-2">
                    <h2 className="text-xl">Rezultatele testului</h2>
                    <p className="whitespace-pre-wrap">{submission.test_results}</p>
                </section>
            )}

            <section className="card flex flex-col gap-2">
                <h2 className="text-xl">Fiabilitate</h2>
                <p className="text-sm">
                    Itemi cu 2 evaluări completate: {reliability.completedItems} din {reliability.assignedItems}
                </p>
                {reliability.agreement ? (
                    <p>
                        Acord {(reliability.agreement.percentAgreement * 100).toFixed(0)}% · κ ={" "}
                        {fmt(reliability.agreement.kappa)} · AC1 = {fmt(reliability.agreement.ac1)}
                    </p>
                ) : (
                    <p className="text-sm text-ink-soft">Nu există încă itemi evaluați de doi validatori.</p>
                )}
                {reliability.icc ? (
                    <p>
                        ICC(1) = {fmt(reliability.icc.icc1)} · ICC(1,2) = {fmt(reliability.icc.icc1k)} (pe{" "}
                        {reliability.icc.n} itemi valizi la ambii)
                    </p>
                ) : (
                    <p className="text-sm text-ink-soft">
                        ICC: sunt necesari cel puțin 2 itemi valizi la ambii validatori.
                    </p>
                )}
                <p className="text-sm text-ink-soft">
                    Pe cel mult 20 de itemi, valorile sunt orientative. Cifrele relevante sunt cele de pe
                    cohortă, la pagina de statistici.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="text-2xl">Feedback</h2>
                {feedback?.map((f) => (
                    <div key={f.id} className="card card-note">
                        <p className="text-xs text-ink-soft">{fmtDate(f.created_at)}</p>
                        <p className="whitespace-pre-wrap">{f.feedback_text}</p>
                    </div>
                ))}
                <div className="card">
                    <FeedbackForm submissionId={id} />
                </div>
            </section>
        </main>
    );
}