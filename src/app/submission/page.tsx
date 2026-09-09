import { createClient } from "@/lib/supabase/server";
import { getCurrentCohort } from "@/lib/current-cohort";
import { saveHypothesis, addQuestion, saveQuestion, deleteQuestion } from "./actions";

export default async function SubmissionPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const cohort = await getCurrentCohort();

    if (!cohort) {
        return <main className="p-8">No active lab session yet.</main>;
    }

    let { data: submission } = await supabase
        .from("submissions")
        .select("id, hypothesis")
        .eq("user_id", user!.id)
        .eq("cohort_id", cohort.id)
        .maybeSingle();

    if (!submission) {
        const { data: newSub } = await supabase
            .from("submissions")
            .insert({ user_id: user!.id, cohort_id: cohort.id })
            .select("id, hypothesis")
            .single();
        submission = newSub;
    }

    const { data: questions } = await supabase
        .from("questions")
        .select("id, prompt, category, choices, correct_choice_index")
        .eq("submission_id", submission!.id)
        .order("order_index", { ascending: true });

    const locked = !!cohort.m1_closed_at;

    return (
        <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
            <h1 className="text-xl font-medium">{cohort.name}</h1>

            <section>
                <h2 className="font-medium mb-2">Hypothesis</h2>
                <form action={saveHypothesis.bind(null, submission!.id)} className="flex flex-col gap-2">
          <textarea
              name="hypothesis"
              defaultValue={submission!.hypothesis ?? ""}
              disabled={locked}
              rows={3}
              className="border rounded px-3 py-2"
          />
                    {!locked && (
                        <button className="self-start rounded bg-black px-3 py-2 text-white">
                            Save hypothesis
                        </button>
                    )}
                </form>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-medium">Questions ({questions?.length ?? 0}/16)</h2>

                {questions?.map((q) => (
                    <form
                        key={q.id}
                        action={saveQuestion.bind(null, q.id)}
                        className="flex flex-col gap-2 border rounded p-4"
                    >
                        <input
                            name="prompt"
                            defaultValue={q.prompt ?? ""}
                            disabled={locked}
                            placeholder="Question prompt"
                            className="rounded border px-3 py-2"
                        />
                        <input
                            name="category"
                            defaultValue={q.category ?? ""}
                            disabled={locked}
                            placeholder="Category"
                            className="rounded border px-3 py-2"
                        />
                        {[0, 1, 2, 3].map((i) => (
                            <label key={i} className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    name="correct_choice_index"
                                    value={i}
                                    defaultChecked={q.correct_choice_index === i}
                                    disabled={locked}
                                />
                                <input
                                    name={`choice${i}`}
                                    defaultValue={q.choices?.[i] ?? ""}
                                    disabled={locked}
                                    placeholder={`Choice ${i + 1}`}
                                    className="flex-1 rounded border px-3 py-2"
                                />
                            </label>
                        ))}
                        {!locked && (
                            <div className="flex gap-2">
                                <button className="rounded bg-black px-3 py-2 text-sm text-white">
                                    Save
                                </button>
                                <button
                                    formAction={deleteQuestion.bind(null, q.id)}
                                    className="rounded border px-3 py-2 text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        )}
                    </form>
                ))}

                {!locked && (questions?.length ?? 0) < 16 && (
                    <form action={addQuestion.bind(null, submission!.id, questions?.length ?? 0)}>
                        <button className="rounded border px-3 py-2 text-sm">Add question</button>
                    </form>
                )}
            </section>
        </main>
    );
}