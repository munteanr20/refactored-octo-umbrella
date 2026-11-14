import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCohortForAdmin } from "@/lib/current-cohort";
import PageHeader from "@/components/page-header";
import CohortPicker from "@/components/cohort-picker";
import ValidateForm, { type Item } from "@/app/validate/validate-form";
import { fillMissingEvaluations } from "./actions";

export const metadata = { title: "Completări" };

const BATCH = 20;

type Row = {
    id: string;
    verdict: string | null;
    rating: number | null;
    profiles: { email: string } | null; // the validator who did not answer
    questions: {
        prompt: string | null;
        category: string | null;
        source_url: string | null;
        submissions: { profiles: { email: string } | null } | null; // the author
    } | null;
};

export default async function AdminLabelsPage({
                                                  searchParams,
                                              }: {
    searchParams: Promise<{ cohort?: string; saved?: string; error?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();
    const cohort = await getCohortForAdmin(params.cohort);

    if (!cohort) {
        return (
            <main className="page">
                <PageHeader title="Completări">Nu există nicio cohortă.</PageHeader>
            </main>
        );
    }

    const closed = !!cohort.m2_closed_at;
    const released = !!cohort.results_released_at;

    let total = 0;
    let items: Item[] = [];

    if (closed && !released) {
        const { count } = await supabase
            .from("validations")
            .select("id, questions!inner(submissions!inner(cohort_id))", { count: "exact", head: true })
            .is("verdict", null)
            .eq("questions.submissions.cohort_id", cohort.id);
        total = count ?? 0;

        const { data } = await supabase
            .from("validations")
            .select(
                "id, verdict, rating, profiles!validator_id(email), questions!inner(prompt, category, source_url, submissions!inner(cohort_id, profiles(email)))"
            )
            .is("verdict", null)
            .eq("questions.submissions.cohort_id", cohort.id)
            .order("id")
            .limit(BATCH);

        items = ((data ?? []) as unknown as Row[]).map((v) => ({
            id: v.id,
            verdict: v.verdict,
            rating: v.rating,
            source_url: v.questions?.source_url ?? null,
            prompt: v.questions?.prompt ?? null,
            category: v.questions?.category ?? null,
            author: v.questions?.submissions?.profiles?.email ?? null,
            validator: v.profiles?.email ?? null,
        }));
    }

    return (
        <main className="page">
            <PageHeader title="Completări de către echipă">
                Evaluările pe care studenții nu le-au dat. Cele completate aici sunt marcate „Staff” în
                exporturi și intră în ICC, κ și AC1 ca orice altă evaluare.
            </PageHeader>

            <CohortPicker selectedId={cohort.id} action="/admin/labels" />

            {params.saved && (
                <p role="status" className="alert alert-ok">Evaluările au fost salvate.</p>
            )}
            {params.error && (
                <p role="alert" className="alert alert-error">{params.error}</p>
            )}

            {!closed && (
                <p className="card text-ink-soft">
                    Completările încep după ce închizi validarea, din{" "}
                    <Link href="/admin/cohorts" className="underline">Cohorte</Link>.
                </p>
            )}

            {closed && released && (
                <p className="card text-ink-soft">
                    Rezultatele sunt deja publicate, deci evaluările nu mai pot fi completate.
                </p>
            )}

            {closed && !released && total === 0 && (
                <div className="card flex flex-col gap-3">
                    <p>Nu mai lipsește nicio evaluare.</p>
                    <Link href="/admin/cohorts" className="btn btn-primary self-start">
                        Mergi la publicarea rezultatelor
                    </Link>
                </div>
            )}

            {closed && !released && total > 0 && (
                <>
                    <p className="text-sm text-ink-soft">
                        Mai sunt {total} evaluări necompletate. Pe pagină apar primele {Math.min(BATCH, total)};
                        după salvare apar următoarele.
                    </p>
                    <ValidateForm
                        items={items}
                        locked={false}
                        action={fillMissingEvaluations.bind(null, cohort.id)}
                    />
                </>
            )}
        </main>
    );
}