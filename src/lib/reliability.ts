import { createClient } from "@/lib/supabase/server";
import {
    binaryAgreement,
    iccOneWay,
    type BinaryAgreement,
    type IccResult,
} from "./stats";

type Row = {
    id: string;
    question_id: string;
    validator_id: string;
    verdict: "valid" | "invalid" | null;
    rating: number | null;
    profiles: { email: string } | null; // the validator
};

// PostgREST returns at most 1000 rows per request, so page through.
const PAGE_SIZE = 1000;

async function fetchRows(filter: {
    cohortId?: string;
    submissionId?: string;
}): Promise<Row[]> {
    const supabase = await createClient();
    const rows: Row[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
        let query = supabase
            .from("validations")
            .select(
                "id, question_id, validator_id, verdict, rating, profiles!validator_id(email), questions!inner(submission_id, submissions!inner(cohort_id))"
            )
            .order("id")
            .range(from, from + PAGE_SIZE - 1);

        if (filter.cohortId) {
            query = query.eq("questions.submissions.cohort_id", filter.cohortId);
        }
        if (filter.submissionId) {
            query = query.eq("questions.submission_id", filter.submissionId);
        }

        const { data, error } = await query;
        if (error) {
            console.error("reliability: fetch failed", error);
            break;
        }

        const page = (data ?? []) as unknown as Row[];
        rows.push(...page);
        if (page.length < PAGE_SIZE) break;
    }

    return rows;
}

function analyze(rows: Row[]) {
    const byItem = new Map<string, Row[]>();
    for (const r of rows) {
        const list = byItem.get(r.question_id);
        if (list) list.push(r);
        else byItem.set(r.question_id, [r]);
    }

    const validCounts: number[] = [];
    const ratingPairs: [number, number][] = [];
    let completedItems = 0;

    for (const list of byItem.values()) {
        const done = list
            .filter((r) => r.verdict !== null)
            .sort((a, b) => a.validator_id.localeCompare(b.validator_id));
        if (done.length < 2) continue;

        const [a, b] = done;
        completedItems++;
        validCounts.push((a.verdict === "valid" ? 1 : 0) + (b.verdict === "valid" ? 1 : 0));

        if (
            a.verdict === "valid" &&
            b.verdict === "valid" &&
            a.rating !== null &&
            b.rating !== null
        ) {
            ratingPairs.push([a.rating, b.rating]);
        }
    }

    return {
        byItem,
        completedItems,
        ratedPairs: ratingPairs.length,
        agreement: binaryAgreement(validCounts),
        icc: iccOneWay(ratingPairs),
    };
}

export type Reliability = {
    assignedItems: number;
    completedItems: number; // items with at least 2 completed verdicts
    ratedPairs: number; // items valid for both validators (ICC sample)
    agreement: BinaryAgreement | null;
    icc: IccResult | null;
};

export async function computeSubmissionReliability(
    submissionId: string
): Promise<Reliability> {
    const a = analyze(await fetchRows({ submissionId }));
    return {
        assignedItems: a.byItem.size,
        completedItems: a.completedItems,
        ratedPairs: a.ratedPairs,
        agreement: a.agreement,
        icc: a.icc,
    };
}

export type CohortReport = Reliability & {
    incompleteItems: number;
    underAssignedItems: number; // items with fewer than 2 validators assigned
    pendingByValidator: { email: string; remaining: number }[];
};

export async function computeCohortReport(cohortId: string): Promise<CohortReport> {
    const rows = await fetchRows({ cohortId });
    const a = analyze(rows);

    const pending = new Map<string, number>();
    let underAssignedItems = 0;

    for (const list of a.byItem.values()) {
        if (list.length < 2) underAssignedItems++;
        for (const r of list) {
            if (r.verdict === null) {
                const email = r.profiles?.email ?? r.validator_id;
                pending.set(email, (pending.get(email) ?? 0) + 1);
            }
        }
    }

    return {
        assignedItems: a.byItem.size,
        completedItems: a.completedItems,
        ratedPairs: a.ratedPairs,
        agreement: a.agreement,
        icc: a.icc,
        incompleteItems: a.byItem.size - a.completedItems,
        underAssignedItems,
        pendingByValidator: [...pending.entries()]
            .map(([email, remaining]) => ({ email, remaining }))
            .sort((x, y) => y.remaining - x.remaining),
    };
}