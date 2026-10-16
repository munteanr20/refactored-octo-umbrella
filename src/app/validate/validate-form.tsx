"use client";

import { useState } from "react";
import SubmitButton from "@/components/submit-button";

export type Item = {
    id: string;
    verdict: string | null;
    rating: number | null;
    source_url: string | null;
    prompt: string | null;
    category: string | null;
};

const RATINGS = [
    { value: 1, label: "Deloc realist" },
    { value: 2, label: "Puțin realist" },
    { value: 3, label: "Realist" },
    { value: 4, label: "Destul de realist" },
];

export default function ValidateForm({
                                         items,
                                         locked,
                                         action,
                                     }: {
    items: Item[];
    locked: boolean;
    action: (formData: FormData) => void | Promise<void>;
}) {
    const [verdicts, setVerdicts] = useState<Record<string, string | null>>(() =>
        Object.fromEntries(items.map((i) => [i.id, i.verdict]))
    );
    const [ratings, setRatings] = useState<Record<string, number | null>>(() =>
        Object.fromEntries(items.map((i) => [i.id, i.rating]))
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    function clearError(id: string) {
        setErrors((prev) => {
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
        });
    }

    function chooseVerdict(id: string, verdict: "valid" | "invalid") {
        setVerdicts((prev) => ({ ...prev, [id]: verdict }));
        // An invalid item must not keep a rating.
        if (verdict === "invalid") {
            setRatings((prev) => ({ ...prev, [id]: null }));
        }
        clearError(id);
    }

    function chooseRating(id: string, rating: number) {
        setRatings((prev) => ({ ...prev, [id]: rating }));
        clearError(id);
    }

    function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        const found: Record<string, string> = {};
        let firstId: string | null = null;

        for (const item of items) {
            const verdict = verdicts[item.id];
            const rating = ratings[item.id];

            let message = "";
            if (verdict !== "valid" && verdict !== "invalid") {
                message = "Alege valid sau invalid.";
            } else if (verdict === "valid" && rating === null) {
                message = "Alege o notă de la 1 la 4.";
            }

            if (message) {
                found[item.id] = message;
                if (firstId === null) firstId = item.id;
            }
        }

        if (firstId !== null) {
            e.preventDefault();
            setErrors(found);
            document
                .getElementById(`item-${firstId}`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }

        setErrors({});
    }

    const answered = items.filter((i) => {
        const v = verdicts[i.id];
        return v === "invalid" || (v === "valid" && ratings[i.id] != null);
    }).length;
    const pct = items.length ? Math.round((answered / items.length) * 100) : 0;
    const errorCount = Object.keys(errors).length;

    return (
        <form action={action} onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
            {items.map((item, idx) => {
                const verdict = verdicts[item.id];
                const ratingEnabled = !locked && verdict === "valid";
                const err = errors[item.id];

                return (
                    <div
                        key={item.id}
                        id={`item-${item.id}`}
                        className={`card flex flex-col gap-5 ${err ? "card-error" : ""}`}
                    >
                        <div className="flex items-center justify-between gap-2">
                            <h2 className="text-xl">Item {idx + 1}</h2>
                            {item.category && <span className="badge badge-mute">{item.category}</span>}
                        </div>

                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-semibold">Promptul</p>
                            <p className="whitespace-pre-wrap rounded-xl border border-line bg-paper p-3">
                                {item.prompt}
                            </p>
                            {item.source_url && (
                                <a
                                    href={item.source_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="break-all text-sm underline"
                                >
                                    Deschide cazul de pe euvsdisinfo.eu
                                </a>
                            )}
                        </div>

                        <fieldset className="flex flex-col gap-2">
                            <legend className="mb-1 text-sm font-semibold">Este un item valid?</legend>
                            <div className="grid grid-cols-2 gap-2">
                                <label className="choice">
                                    <input
                                        type="radio"
                                        className="choice-input"
                                        name={`verdict_${item.id}`}
                                        value="valid"
                                        checked={verdict === "valid"}
                                        onChange={() => chooseVerdict(item.id, "valid")}
                                        disabled={locked}
                                    />
                                    <span className="choice-box font-semibold">Valid</span>
                                </label>
                                <label className="choice">
                                    <input
                                        type="radio"
                                        className="choice-input is-bad"
                                        name={`verdict_${item.id}`}
                                        value="invalid"
                                        checked={verdict === "invalid"}
                                        onChange={() => chooseVerdict(item.id, "invalid")}
                                        disabled={locked}
                                    />
                                    <span className="choice-box font-semibold">Invalid</span>
                                </label>
                            </div>
                        </fieldset>

                        <fieldset className="flex flex-col gap-2">
                            <legend className="mb-1 text-sm font-semibold">Cât de realist este promptul?</legend>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {RATINGS.map((r) => (
                                    <label key={r.value} className="choice">
                                        <input
                                            type="radio"
                                            className="choice-input"
                                            name={`rating_${item.id}`}
                                            value={r.value}
                                            checked={ratings[item.id] === r.value}
                                            onChange={() => chooseRating(item.id, r.value)}
                                            disabled={!ratingEnabled}
                                        />
                                        <span className="choice-box flex-col !items-start !gap-0">
                                            <span className="font-display text-xl">{r.value}</span>
                                            <span className="text-xs text-ink-soft">{r.label}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {!ratingEnabled && !locked && (
                                <p className="text-sm text-ink-soft">
                                    Nota se alege doar pentru itemii marcați valid.
                                </p>
                            )}
                        </fieldset>

                        {err && (
                            <p role="alert" className="text-sm text-ember">
                                {err}
                            </p>
                        )}
                    </div>
                );
            })}

            {!locked && (
                <div className="sticky-bar flex flex-col gap-2">
                    <div className="progress" aria-hidden="true">
                        <div style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm">
                            <strong>{answered}</strong> din {items.length} itemi evaluați
                        </p>
                        <SubmitButton pendingLabel="Se salvează...">Salvează evaluările</SubmitButton>
                    </div>
                    {errorCount > 0 && (
                        <p role="alert" className="alert alert-error">
                            Mai ai {errorCount} {errorCount === 1 ? "item necompletat" : "itemi necompletați"}.
                        </p>
                    )}
                </div>
            )}
        </form>
    );
}