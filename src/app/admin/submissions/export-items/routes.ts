import { createClient } from "@/lib/supabase/server";
import { getCurrentCohort } from "@/lib/current-cohort";

function csvEscape(value: string | null | undefined): string {
    const str = value ?? "";
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

type ItemRow = {
    id: string;
    source_url: string | null;
    prompt: string | null;
    category: string | null;
    order_index: number;
    submissions: {
        hypothesis_null: string | null;
        hypothesis_alt: string | null;
        profiles: { email: string } | null;
    };
};

const PAGE_SIZE = 1000;

export async function GET() {
    const supabase = await createClient();
    const cohort = await getCurrentCohort();

    if (!cohort) {
        return new Response("No active cohort", { status: 404 });
    }

    const items: ItemRow[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await supabase
            .from("questions")
            .select(
                "id, source_url, prompt, category, order_index, submissions!inner(cohort_id, hypothesis_null, hypothesis_alt, profiles(email))"
            )
            .eq("submissions.cohort_id", cohort.id)
            .order("id")
            .range(from, from + PAGE_SIZE - 1);

        if (error) {
            console.error("export-items failed:", error);
            return new Response("Export failed", { status: 500 });
        }

        const page = (data ?? []) as unknown as ItemRow[];
        items.push(...page);
        if (page.length < PAGE_SIZE) break;
    }

    items.sort((a, b) => {
        const ea = a.submissions.profiles?.email ?? "";
        const eb = b.submissions.profiles?.email ?? "";
        return ea.localeCompare(eb) || a.order_index - b.order_index;
    });

    const header = [
        "author_email",
        "hypothesis_null",
        "hypothesis_alt",
        "item_number",
        "source_url",
        "prompt",
        "category",
        "item_id",
    ];

    const rows: string[] = [header.join(",")];
    for (const q of items) {
        rows.push(
            [
                csvEscape(q.submissions.profiles?.email),
                csvEscape(q.submissions.hypothesis_null),
                csvEscape(q.submissions.hypothesis_alt),
                String(q.order_index + 1),
                csvEscape(q.source_url),
                csvEscape(q.prompt),
                csvEscape(q.category),
                csvEscape(q.id),
            ].join(",")
        );
    }

    return new Response("\uFEFF" + rows.join("\n"), {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${cohort.name.replace(/[^\w.-]+/g, "_")}-items.csv"`,
        },
    });
}