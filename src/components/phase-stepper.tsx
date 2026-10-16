type Phase = {
    m1_closed_at: string | null;
    groups_formed_at: string | null;
    m2_closed_at: string | null;
};
type State = "done" | "active" | "todo";

function getSteps(c: Phase): { label: string; hint: string; state: State }[] {
    const m1 = !!c.m1_closed_at;
    const groups = !!c.groups_formed_at;
    const m2 = !!c.m2_closed_at;
    return [
        {
            label: "Trimiterea itemilor",
            state: m1 ? "done" : "active",
            hint: m1 ? "încheiată" : "deschisă",
        },
        {
            label: "Validarea reciprocă",
            state: m2 ? "done" : groups ? "active" : "todo",
            hint: m2 ? "încheiată" : groups ? "deschisă" : m1 ? "se formează grupurile" : "urmează",
        },
        {
            label: "Rezultatele testării",
            state: m2 ? "active" : "todo",
            hint: m2 ? "deschis" : "urmează",
        },
    ];
}

function Marker({ state, n }: { state: State; n: number }) {
    if (state === "done") {
        return (
            <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-gold">
                <svg width="14" height="14" viewBox="0 0 14 14">
                    <path d="M3 7.5l2.5 2.5L11 4" fill="none" stroke="var(--surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </span>
        );
    }
    return (
        <span
            aria-hidden="true"
            className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold ${
                state === "active" ? "border-brand text-brand" : "border-line text-ink-soft"
            }`}
        >
            {n}
        </span>
    );
}

export default function PhaseStepper({ cohort }: { cohort: Phase }) {
    const steps = getSteps(cohort);
    return (
        <ol className="grid grid-cols-3 gap-3" aria-label="Etapele laboratorului">
            {steps.map((s, i) => (
                <li
                    key={s.label}
                    aria-current={s.state === "active" ? "step" : undefined}
                    className="flex flex-col gap-2"
                >
                    <div className="flex items-center gap-2">
                        <Marker state={s.state} n={i + 1} />
                        {i < steps.length - 1 && <span className="h-px flex-1 bg-line" aria-hidden="true" />}
                    </div>
                    <div>
                        <p className={`text-sm font-semibold ${s.state === "todo" ? "text-ink-soft" : ""}`}>
                            {s.label}
                        </p>
                        <p className="text-xs text-ink-soft">{s.hint}</p>
                    </div>
                </li>
            ))}
        </ol>
    );
}