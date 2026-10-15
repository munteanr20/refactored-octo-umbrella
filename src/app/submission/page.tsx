import { createClient } from "@/lib/supabase/server";
import { getCurrentCohort } from "@/lib/current-cohort";
import { saveHypothesis, addQuestion, saveQuestion, deleteQuestion, saveTestResults } from "./actions";

export default async function SubmissionPage({
                                                 searchParams,
                                             }: {
    searchParams: Promise<{ error?: string }>;
}) {
    const params = await searchParams;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const cohort = await getCurrentCohort();

    if (!cohort) {
        return <main className="p-8">No active lab session yet.</main>;
    }

    let { data: submission } = await supabase
        .from("submissions")
        .select("id, hypothesis_null, hypothesis_alt, test_results")
        .eq("user_id", user!.id)
        .eq("cohort_id", cohort.id)
        .maybeSingle();

    if (!submission) {
        const { data: newSub } = await supabase
            .from("submissions")
            .insert({ user_id: user!.id, cohort_id: cohort.id })
            .select("id, hypothesis_null, hypothesis_alt, test_results")
            .single();
        submission = newSub;
    }

    const { data: questions } = await supabase
        .from("questions")
        .select("id, prompt, category, source_url")
        .eq("submission_id", submission!.id)
        .order("order_index", { ascending: true });

    const locked = !!cohort.m1_closed_at;

    return (
        <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
            <h1 className="text-xl font-medium">{cohort.name}</h1>

            <section className="flex flex-col gap-3">
                <h2 className="font-medium">Ipoteza</h2>

                <div className="rounded border p-3 text-sm text-gray-600 flex flex-col gap-2">
                    <p>Formulează o ipoteză de unul dintre tipurile:</p>
                    <p>
                        <strong>A.</strong> Modelul X are o rată de acceptare diferită decât
                        Prompt-ul Y la formularea de mesaje de dezinformare.
                    </p>
                    <p>
                        <strong>B.</strong> Prompt-ul X are o rată de acceptare diferită decât
                        Prompt-ul Y la formularea de mesaje de dezinformare de către modelul W.
                    </p>
                    <p>
                        <strong>C.</strong> Dezinformările de tip X au o rată de acceptare
                        diferită decât dezinformările de tip Y în formularea de mesaj de
                        dezinformare de către modelul W.
                    </p>
                </div>

                <form
                    action={saveHypothesis.bind(null, submission!.id)}
                    className="flex flex-col gap-3"
                >
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium">H0 (ipoteza nulă)</span>
                        <textarea
                            name="hypothesis_null"
                            defaultValue={submission!.hypothesis_null ?? ""}
                            disabled={locked}
                            rows={2}
                            className="border rounded px-3 py-2"
                        />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm font-medium">H1 (ipoteza alternativă)</span>
                        <textarea
                            name="hypothesis_alt"
                            defaultValue={submission!.hypothesis_alt ?? ""}
                            disabled={locked}
                            rows={2}
                            className="border rounded px-3 py-2"
                        />
                    </label>
                    {!locked && (
                        <button className="self-start rounded bg-black px-3 py-2 text-white">
                            Save hypothesis
                        </button>
                    )}
                </form>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-medium">Itemi ({questions?.length ?? 0}/20)</h2>

                {params.error && <p className="text-sm text-red-700">{params.error}</p>}

                {questions?.map((q, idx) => (
                    <form
                        key={q.id}
                        action={saveQuestion.bind(null, q.id)}
                        className="flex flex-col gap-2 border rounded p-4"
                    >
                        <p className="text-sm font-medium">Item {idx + 1}</p>
                        <input
                            name="source_url"
                            type="url"
                            defaultValue={q.source_url ?? ""}
                            disabled={locked}
                            placeholder="Link to the EUvsDisinfo case"
                            className="rounded border px-3 py-2"
                        />
                        <textarea
                            name="prompt"
                            defaultValue={q.prompt ?? ""}
                            disabled={locked}
                            rows={3}
                            placeholder="Prompt for the model: ask it to write a social media post based on this false claim"
                            className="rounded border px-3 py-2"
                        />
                        <input
                            name="category"
                            defaultValue={q.category ?? ""}
                            disabled={locked}
                            placeholder="Category"
                            className="rounded border px-3 py-2"
                        />
                        {!locked && (
                            <div className="flex gap-2">
                                <button className="rounded bg-black px-3 py-2 text-sm text-white">
                                    Salveaza
                                </button>
                                <button
                                    formAction={deleteQuestion.bind(null, q.id)}
                                    className="rounded border px-3 py-2 text-sm"
                                >
                                    Sterge
                                </button>
                            </div>
                        )}
                    </form>
                ))}

                {!locked && (questions?.length ?? 0) < 20 && (
                    <form action={addQuestion.bind(null, submission!.id, questions?.length ?? 0)}>
                        <button className="rounded border px-3 py-2 text-sm">Add item</button>
                    </form>
                )}
            </section>
            {cohort.m2_closed_at && (
                <section>
                    <h2 className="font-medium mb-2">Hypothesis test results</h2>
                    <form action={saveTestResults.bind(null, submission!.id)} className="flex flex-col gap-2">
              <textarea
                  name="test_results"
                  defaultValue={submission!.test_results ?? ""}
                  rows={5}
                  placeholder="What did you find when you tested your hypothesis?"
                  className="border rounded px-3 py-2"
              />
                                <button className="self-start rounded bg-black px-3 py-2 text-white">
                                    Save results
                                </button>
                            </form>
                        </section>
                    )}
        </main>
    );
}