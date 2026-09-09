import { createClient } from "@/lib/supabase/server";
import { addFeedback } from "./actions";

type SubmissionDetail = {
    id: string;
    hypothesis: string | null;
    profiles: { email: string } | null;
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
        .select("id, hypothesis, profiles(email)")
        .eq("id", id)
        .single();

    const submission = data as SubmissionDetail | null;

    const { data: questions } = await supabase
        .from("questions")
        .select("id, prompt, category, choices, correct_choice_index")
        .eq("submission_id", id)
        .order("order_index", { ascending: true });

    const { data: feedback } = await supabase
        .from("admin_feedback")
        .select("id, feedback_text, created_at")
        .eq("submission_id", id)
        .order("created_at", { ascending: false });

    return (
        <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
            <h1 className="text-xl font-medium">{submission?.profiles?.email}</h1>

            <section>
                <h2 className="font-medium mb-2">Hypothesis</h2>
                <p>{submission?.hypothesis}</p>
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-medium">Questions</h2>
                {questions?.map((q, idx) => (
                    <div key={q.id} className="border rounded p-4">
                        <p className="font-medium">{idx + 1}. {q.prompt}</p>
                        <p className="text-sm text-gray-600">{q.category}</p>
                        <ul className="mt-2">
                            {q.choices?.map((choice: string, i: number) => (
                                <li
                                    key={i}
                                    className={i === q.correct_choice_index ? "font-medium text-green-700" : ""}
                                >
                                    {choice}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>

            <section className="flex flex-col gap-4">
                <h2 className="font-medium">Feedback</h2>
                {feedback?.map((f) => (
                    <p key={f.id} className="text-sm border-l-2 pl-3">{f.feedback_text}</p>
                ))}
                <form action={addFeedback.bind(null, id)} className="flex flex-col gap-2">
                    <textarea name="feedback_text" rows={3} className="border rounded px-3 py-2" />
                    <button className="self-start rounded bg-black px-3 py-2 text-white">
                        Add feedback
                    </button>
                </form>
            </section>
        </main>
    );
}