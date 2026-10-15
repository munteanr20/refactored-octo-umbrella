import { createClient } from "@/lib/supabase/server";
import { getCurrentM2Cohort } from "@/lib/current-cohort";
import { saveAllValidations } from "./actions";
import ValidateForm, { type Item } from "./validate-form";

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

    const locked = !!cohort?.m2_closed_at;
    const total = items.length;
    const done = items.filter((i) => i.verdict).length;

    return (
        <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
            <h1 className="text-xl font-medium">Itemi de evaluat</h1>

            {total > 0 && (
                <p className="text-sm text-gray-600">
                    Completate: {done} din {total}
                    {locked && " (evaluarea este închisă)"}
                </p>
            )}

            {params.saved && !params.error && (
                <p className="text-sm text-green-700">Evaluările au fost salvate.</p>
            )}
            {params.error && <p className="text-sm text-red-700">{params.error}</p>}

            {total === 0 && <p>Nu ți-a fost atribuit nimic încă.</p>}

            {total > 0 && (
                <ValidateForm items={items} locked={locked} action={saveAllValidations} />
            )}
        </main>
    );
}