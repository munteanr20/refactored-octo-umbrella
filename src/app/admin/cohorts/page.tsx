import { createClient } from "@/lib/supabase/server";
import { createCohort, closeM1 } from "./actions";

export default async function AdminCohortsPage() {
    const supabase = await createClient();

    const { data: cohorts } = await supabase
        .from("cohorts")
        .select("id, name, m1_closed_at")
        .order("created_at", { ascending: false });

    return (
        <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
        <h1 className="text-xl font-medium">Cohorts</h1>

            <ul className="flex flex-col gap-3">
        {cohorts?.map((cohort) => (
            <li key={cohort.id} className="border rounded p-3">
        <p>{cohort.name}</p>
        <p className="text-sm text-gray-600">
        {cohort.m1_closed_at ? "M1 closed" : "M1 open"}
        </p>
    {!cohort.m1_closed_at && (
        <form action={closeM1.bind(null, cohort.id)}>
        <button className="text-sm underline mt-1">Close M1</button>
    </form>
    )}
    </li>
))}
    </ul>

    <form action={createCohort} className="flex flex-col gap-2">
    <input name="name" placeholder="Cohort name" className="border rounded px-3 py-2" />
    <button className="rounded bg-black px-3 py-2 text-white">Create cohort</button>
    </form>
    </main>
);
}