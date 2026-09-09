import { createClient } from "@/lib/supabase/server";
import { getCurrentCohort } from "@/lib/current-cohort";

function csvEscape(value: string | null | undefined): string {
    const str = value ?? "";
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

type ExportRow = {
    id: string;
    hypothesis: string | null;
    profiles: { email: string } | null;
    questions: {
        prompt: string | null;
        category: string | null;
        choices: string[] | null;
        correct_choice_index: number | null;
    }[];
};

export async function GET() {
    const supabase = await createClient();
    const cohort = await getCurrentCohort();

    if (!cohort) {
        return new Response("No active cohort", { status: 404 });
    }

    const { data } = await supabase
        .from("submissions")
        .select(
            "id, hypothesis, profiles(email), questions(prompt, category, choices, correct_choice_index)"
        )
        .eq("cohort_id", cohort.id);

    const submissions = data as ExportRow[] | null;

    const header = [
        "student_email",
        "hypothesis",
        "question_prompt",
        "category",
        "choice_1",
        "choice_2",
        "choice_3",
        "choice_4",
        "correct_choice_index",
    ];

    const rows: string[] = [header.join(",")];

    submissions?.forEach((s) => {
        const email = s.profiles?.email ?? "";
        const questions = s.questions ?? [];

        questions.forEach((q) => {
            rows.push(
                [
                    csvEscape(email),
                    csvEscape(s.hypothesis),
                    csvEscape(q.prompt),
                    csvEscape(q.category),
                    csvEscape(q.choices?.[0]),
                    csvEscape(q.choices?.[1]),
                    csvEscape(q.choices?.[2]),
                    csvEscape(q.choices?.[3]),
                    String(q.correct_choice_index ?? ""),
                ].join(",")
            );
        });
    });

    return new Response(rows.join("\n"), {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${cohort.name}-submissions.csv"`,
        },
    });
}