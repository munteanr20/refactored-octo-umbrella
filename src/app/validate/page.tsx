import { createClient } from "@/lib/supabase/server";
import { getCurrentM2Cohort } from "@/lib/current-cohort";
import PageHeader from "@/components/page-header";
import { saveAllValidations } from "./actions";
import ValidateForm, { type Item } from "./validate-form";

export const metadata = { title: "Validare" };

type ValidationRow = {
    id: string;
    verdict: string | null;
    rating: number | null;
    questions: {
        prompt: string | null;
        category: string | null;
        source_url: string | null;
    } | null;
};

export default async function ValidatePage({
                                               searchParams,
                                           }: {
    searchParams: Promise<{ error?: string; saved?: string }>;
}) {
    const params = await searchParams;
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    const cohort = await getCurrentM2Cohort();

    if (!cohort) {
        return (
            <main className="page">
                <PageHeader title="Validare">
                    Validarea începe după ce profesorul închide trimiterea itemilor și formează grupurile.
                </PageHeader>
            </main>
        );
    }

    const { data } = await supabase
        .from("validations")
        .select("id, verdict, rating, questions(prompt, category, source_url)")
        .eq("validator_id", user!.id)
        .order("id");

    const validations = data as unknown as ValidationRow[] | null;

    const items: Item[] = (validations ?? []).map((v) => ({
        id: v.id,
        verdict: v.verdict,
        rating: v.rating,
        source_url: v.questions?.source_url ?? null,
        prompt: v.questions?.prompt ?? null,
        category: v.questions?.category ?? null,
    }));

    const locked = !!cohort.m2_closed_at;
    const total = items.length;
    const done = items.filter((i) => i.verdict).length;

    return (
        <main className="page">
            <PageHeader title="Itemi de evaluat">
                {locked
                    ? "Evaluarea s-a încheiat. Răspunsurile tale sunt afișate mai jos."
                    : "Itemii sunt anonimi: nu vezi cine i-a scris. Toți itemii trebuie evaluați."}
            </PageHeader>

            {total > 0 && (
                <p className="text-sm text-ink-soft">
                    Salvate: {done} din {total}
                </p>
            )}

            {params.saved && !params.error && (
                <p role="status" className="alert alert-ok">Evaluările au fost salvate.</p>
            )}
            {params.error && (
                <p role="alert" className="alert alert-error">{params.error}</p>
            )}

            {total === 0 && (
                <p className="card text-ink-soft">Nu ți-a fost atribuit niciun item.</p>
            )}

            {total > 0 && (
                <ValidateForm items={items} locked={locked} action={saveAllValidations} />
            )}
        </main>
    );
}