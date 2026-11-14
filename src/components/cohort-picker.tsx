import { listCohorts } from "@/lib/current-cohort";

export default async function CohortPicker({
                                               selectedId,
                                               action,
                                           }: {
    selectedId: string;
    action: string;
}) {
    const cohorts = await listCohorts();
    if (cohorts.length < 2) return null;

    return (
        <form method="get" action={action} className="flex flex-wrap items-center gap-2">
            <label htmlFor="cohort" className="text-sm font-semibold">
                Cohortă
            </label>
            <select id="cohort" name="cohort" defaultValue={selectedId} className="field !w-auto">
                {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                        {c.name}
                    </option>
                ))}
            </select>
            <button className="btn">Afișează</button>
        </form>
    );
}