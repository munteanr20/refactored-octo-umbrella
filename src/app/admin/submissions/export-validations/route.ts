import { createClient } from "@/lib/supabase/server";
import { getCurrentCohort } from "@/lib/current-cohort";

function csvEscape(value: string | null | undefined): string {
    const str = value ?? "";
    if (/[",\n]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

type ValidationRow = {
    verdict: string | null;
    rating: number | null;
    profiles: { email: string } | null;
    questions: {
        id: string;
        source_url: string | null;
        prompt: string | null;
        category: string | null;
        order_index: number;
        submissions: { cohort_id: string; profiles: { email: string } | null };
    };
};

const PAGE_SIZE = 1000;

export async function GET() {
    const supabase = await createClient();
    const cohort = await getCurrentCohort();

    if (!cohort) {
        return new Response("No active cohort", { status: 404 });
    }

    const validations: ValidationRow[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
            .from("validations")
            .select(
                "verdict, rating, profiles!validator_id(email), questions!inner(id, source_url, prompt, category, order_index, submissions!inner(cohort_id, profiles(email)))"
            )
            .eq("questions.submissions.cohort_id", cohort.id)
            .order("id")
            .range(from, from + PAGE_SIZE - 1);

        if (error) {
            console.error("export-validations failed:", error);
            return new Response("Export failed", { status: 500 });
        }

        const page = (data ?? []) as unknown as ValidationRow[];
        validations.push(...page);
        if (page.length < PAGE_SIZE) break;
    }

    const header = [
        "item_id",
        "author_email",
        "item_number",
        "source_url",
        "prompt",
        "category",
        "validator_email",
        "verdict",
        "rating",
    ];

    const rows: string[] = [header.join(",")];

    validations.forEach((v) => {
        rows.push(
            [
                csvEscape(v.questions.id),
                csvEscape(v.questions.submissions.profiles?.email),
                String(v.questions.order_index + 1),
                csvEscape(v.questions.source_url),
                csvEscape(v.questions.prompt),
                csvEscape(v.questions.category),
                csvEscape(v.profiles?.email),
                csvEscape(v.verdict),
                v.rating === null ? "" : String(v.rating),
            ].join(",")
        );
    });

    return new Response("\uFEFF" + rows.join("\n"), {
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${cohort.name.replace(/[^\w.-]+/g, "_")}-validations.csv"`,
        },
    });
}