import { createClient } from "@/lib/supabase/server";
import { getCurrentCohort } from "@/lib/current-cohort";

function csvEscape(value: string | number | null | undefined): string {
    const str = value === null || value === undefined ? "" : String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

type ResultRow = {
    item_number: number;
    source_url: string | null;
    prompt: string | null;
    category: string | null;
    evaluator: string | null;
    verdict: string | null;
    rating: number | null;
};

export async function GET() {
    const cohort = await getCurrentCohort();

    if (!cohort?.results_released_at) {
        return new Response("Rezultatele nu sunt încă disponibile.", { status: 403 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("my_released_results", {
        p_cohort_id: cohort.id,
    });

    if (error) {
        console.error("export-results failed:", error);
        return new Response("Exportul a eșuat.", { status: 500 });
    }

    const rows = (data ?? []) as ResultRow[];
    const header = ["item_number", "source_url", "prompt", "category", "evaluator", "verdict", "rating"];
    const lines = [header.join(",")];

    for (const r of rows) {
        lines.push(
            [
                csvEscape(r.item_number),
                csvEscape(r.source_url),
                csvEscape(r.prompt),
                csvEscape(r.category),
                csvEscape(r.evaluator),
                csvEscape(r.verdict),
                csvEscape(r.rating),
            ].join(",")
        );
    }

    return new Response("﻿" + lines.join("\n"), {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="itemii-mei-si-evaluari.csv"',
        },
    });
}