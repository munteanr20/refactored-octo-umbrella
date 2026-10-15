import { createClient } from "@/lib/supabase/server";
import { computeSubmissionReliability } from "@/lib/reliability";
import { fmt } from "@/lib/stats";
import { addFeedback } from "./actions";

type SubmissionDetail = {
    id: string;
    hypothesis_null: string | null;
    hypothesis_alt: string | null;
    test_results: string | null;
    profiles: { email: string } | null;
};

type ItemRow = {
    id: string;
    prompt: string | null;
    category: string | null;
    source_url: string | null;
    validations: { verdict: string | null; rating: number | null }[];
};

export default async function SubmissionDetailPage({
                                                       params,
                                                   }: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const { data } = await supabase
        .from("submissions")
        .select("id, hypothesis_null, hypothesis_alt, test_results, profiles(email)")
        .eq("id", id)
        .single();

    const submission = data as SubmissionDetail | null;

    const { data: itemsData } = await supabase
        .from("questions")
        .select("id, prompt, category, source_url, order_index, validations(verdict, rating)")
        .eq("submission_id", id)
        .order("order_index", { ascending: true });

    const items = itemsData as ItemRow[] | null;

    const { data: feedback } = await supabase
        .from("admin_feedback")
        .select("id, feedback_text, created_at")
        .eq("submission_id", id)
        .order("created_at", { ascending: false });

    const reliability = await computeSubmissionReliability(id);

    return (
        <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
            <h1 className="text-xl font-medium">{submission?.profiles?.email}</h1>

            <section className="flex flex-col gap-2">
                <h2 className="font-medium">Ipoteza</h2>
                <p><strong>H0:</strong> {submission?.hypothesis_null}</p>
                <p><strong>H1:</strong> {submission?.hypothesis_alt}</p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-medium">Itemi ({items?.length ?? 0}/20)</h2>
                {items?.map((q, idx) => (
                    <div key={q.id} className="border rounded p-4 flex flex-col gap-1">
                        <p className="font-medium">Item {idx + 1}</p>
                        {q.source_url && (
                            <a
                                href={q.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm underline"
                            >
                                {q.source_url}
                            </a>
                        )}
                        <p>{q.prompt}</p>
                        <p className="text-sm text-gray-600">Categorie: {q.category}</p>
                        <p className="text-sm">
                            Evaluări:{" "}
                            {q.validations.length === 0
                                ? "nimic atribuit"
                                : q.validations
                                    .map((v) =>
                                        v.verdict === "valid"
                                            ? `valid (${v.rating})`
                                            : v.verdict === "invalid"
                                                ? "invalid"
                                                : "în așteptare"
                                    )
                                    .join(", ")}
                        </p>
                    </div>
                ))}
            </section>

            {submission?.test_results && (
                <section>
                    <h2 className="font-medium mb-2">Rezultatele testului</h2>
                    <p className="whitespace-pre-wrap">{submission.test_results}</p>
                </section>
            )}

            <section className="flex flex-col gap-1">
                <h2 className="font-medium mb-1">Fiabilitate</h2>
                <p className="text-sm">
                    Itemi cu 2 evaluări completate: {reliability.completedItems} din{" "}
                    {reliability.assignedItems}
                </p>
                {reliability.agreement ? (
                    <p>
                        Acord {(reliability.agreement.percentAgreement * 100).toFixed(0)}% · κ ={" "}
                        {fmt(reliability.agreement.kappa)} · AC1 = {fmt(reliability.agreement.ac1)}
                    </p>
                ) : (
                    <p className="text-sm text-gray-600">
                        Nu există încă itemi evaluați de doi validatori.
                    </p>
                )}
                {reliability.icc ? (
                    <p>
                        ICC(1) = {fmt(reliability.icc.icc1)} · ICC(1,2) = {fmt(reliability.icc.icc1k)}{" "}
                        (pe {reliability.icc.n} itemi valizi la ambii)
                    </p>
                ) : (
                    <p className="text-sm text-gray-600">
                        ICC: sunt necesari cel puțin 2 itemi valizi la ambii validatori.
                    </p>
                )}
                <p className="text-sm text-gray-600">
                    Pe cel mult 20 de itemi, valorile sunt orientative. Cifrele relevante
                    sunt cele de pe cohortă, la pagina de statistici.
                </p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-medium">Feedback</h2>
                {feedback?.map((f) => (
                    <p key={f.id} className="text-sm border-l-2 pl-3">{f.feedback_text}</p>
                ))}
                <form action={addFeedback.bind(null, id)} className="flex flex-col gap-2">
                    <textarea name="feedback_text" rows={3} className="border rounded px-3 py-2" />
                    <button className="self-start rounded bg-black px-3 py-2 text-white">
                        Adaugă feedback
                    </button>
                </form>
            </section>
        </main>
    );
}