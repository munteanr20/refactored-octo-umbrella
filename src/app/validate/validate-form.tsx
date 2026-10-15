"use client";

import { useState } from "react";

export type Item = {
    id: string;
    verdict: string | null;
    rating: number | null;
    source_url: string | null;
    prompt: string | null;
    category: string | null;
};

const RATINGS = [
    { value: 1, label: "1 – Deloc realist" },
    { value: 2, label: "2 – Puțin realist" },
    { value: 3, label: "3 – Realist" },
    { value: 4, label: "4 – Destul de realist" },
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

    const errorCount = Object.keys(errors).length;

    return (
        <form
            action={action}
            onSubmit={handleSubmit}
            className="flex flex-col gap-6"
        >
            {items.map((item, idx) => {
                const verdict = verdicts[item.id];
                const ratingEnabled = !locked && verdict === "valid";

                return (
                    <div
                        key={item.id}
                        id={`item-${item.id}`}
                        className={`flex flex-col gap-3 rounded border p-4 ${
                            errors[item.id] ? "border-red-600" : ""
                        }`}
                    >
                        <p className="text-sm font-medium">Item {idx + 1}</p>

                        {item.source_url && (
                            <a
                                href={item.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm underline"
                            >
                                {item.source_url}
                            </a>
                        )}
                        <p>{item.prompt}</p>
                        <p className="text-sm text-gray-600">Categorie: {item.category}</p>

                        <div className="flex gap-4">
                            <label className="flex items-center gap-1">
                                <input
                                    type="radio"
                                    name={`verdict_${item.id}`}
                                    value="valid"
                                    checked={verdict === "valid"}
                                    onChange={() => chooseVerdict(item.id, "valid")}
                                    disabled={locked}
                                />
                                Valid
                            </label>
                            <label className="flex items-center gap-1">
                                <input
                                    type="radio"
                                    name={`verdict_${item.id}`}
                                    value="invalid"
                                    checked={verdict === "invalid"}
                                    onChange={() => chooseVerdict(item.id, "invalid")}
                                    disabled={locked}
                                />
                                Invalid
                            </label>
                        </div>

                        <div
                            className={`flex flex-col gap-1 ${
                                ratingEnabled ? "" : "opacity-50"
                            }`}
                        >
                            <p className="text-sm text-gray-600">
                                Dacă ai ales valid, alege și cât de realist este promptul:
                            </p>
                            {RATINGS.map((r) => (
                                <label
                                    key={r.value}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    <input
                                        type="radio"
                                        name={`rating_${item.id}`}
                                        value={r.value}
                                        checked={ratings[item.id] === r.value}
                                        onChange={() => chooseRating(item.id, r.value)}
                                        disabled={!ratingEnabled}
                                    />
                                    {r.label}
                                </label>
                            ))}
                        </div>

                        {errors[item.id] && (
                            <p role="alert" className="text-sm text-red-700">
                                {errors[item.id]}
                            </p>
                        )}
                    </div>
                );
            })}

            {!locked && (
                <div className="flex flex-col gap-2">
                    {errorCount > 0 && (
                        <p role="alert" className="text-sm text-red-700">
                            Mai ai {errorCount}{" "}
                            {errorCount === 1 ? "item necompletat" : "itemi necompletați"}.
                        </p>
                    )}
                    <button className="self-start rounded bg-black px-4 py-2 text-white">
                        Salvează evaluările
                    </button>
                </div>
            )}
        </form>
    );
}