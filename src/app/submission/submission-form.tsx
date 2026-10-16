"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitSubmission } from "./actions";
import {
    MAX_ITEMS,
    validateSubmission,
    type ItemInput,
} from "@/lib/submission-rules";

type Row = ItemInput & { key: number };
type Err = { message: string; part?: string };

type Props = {
    submissionId: string;
    initialH0: string;
    initialH1: string;
    initialItems: ItemInput[];
};

function Field({
                   id,
                   label,
                   hint,
                   error,
                   children,
               }: {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-sm font-semibold">
                {label}
            </label>
            {children}
            {hint && !error && (
                <p id={`${id}-hint`} className="text-sm text-ink-soft">
                    {hint}
                </p>
            )}
            {error && (
                <p id={`${id}-err`} role="alert" className="text-sm text-ember">
                    {error}
                </p>
            )}
        </div>
    );
}

export default function SubmissionForm({
                                           submissionId,
                                           initialH0,
                                           initialH1,
                                           initialItems,
                                       }: Props) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();

    const [h0, setH0] = useState(initialH0);
    const [h1, setH1] = useState(initialH1);
    const nextKey = useRef(Math.max(initialItems.length, 1));
    const [items, setItems] = useState<Row[]>(() =>
        initialItems.length > 0
            ? initialItems.map((it, i) => ({ ...it, key: i }))
            : [{ key: 0, source_url: "", prompt: "", category: "" }]
    );

    const [errors, setErrors] = useState<Record<string, Err>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (!dirty) return;
        const handler = (e: BeforeUnloadEvent) => e.preventDefault();
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [dirty]);

    function touch() {
        setSaved(false);
        setFormError(null);
        setDirty(true);
    }

    function updateItem(key: number, patch: Partial<ItemInput>) {
        touch();
        setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
    }

    function addItem() {
        if (items.length >= MAX_ITEMS) return;
        touch();
        const key = nextKey.current++;
        setItems((prev) => [...prev, { key, source_url: "", prompt: "", category: "" }]);
        setTimeout(() => {
            document.getElementById(`item-${key}-source_url`)?.focus();
        }, 0);
    }

    function removeItem(key: number) {
        touch();
        setItems((prev) => prev.filter((it) => it.key !== key));
    }

    function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();

        const found = validateSubmission(h0.trim(), h1.trim(), items);
        const map: Record<string, Err> = {};
        let firstTarget: string | null = null;

        for (const err of found) {
            let id = err.field;
            let target = err.field;
            if (err.field.startsWith("item-")) {
                const idx = Number(err.field.slice(5));
                const key = items[idx].key;
                id = `item-${key}`;
                target = `item-${key}-${err.part ?? "source_url"}`;
            }
            if (!map[id]) map[id] = { message: err.message, part: err.part };
            if (!firstTarget) firstTarget = target;
        }

        setErrors(map);

        if (firstTarget) {
            const el = document.getElementById(firstTarget);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            (el as HTMLElement | null)?.focus({ preventScroll: true });
            setFormError(
                `Corectează câmpurile marcate (${Object.keys(map).length}).`
            );
            return;
        }

        startTransition(async () => {
            const res = await submitSubmission(
                submissionId,
                h0.trim(),
                h1.trim(),
                items.map(({ source_url, prompt, category }) => ({
                    source_url,
                    prompt,
                    category,
                }))
            );
            if (res.ok) {
                setSaved(true);
                setDirty(false);
                setFormError(null);
                router.refresh();
            } else {
                setSaved(false);
                setFormError(res.error);
            }
        });
    }

    const completed = items.filter(
        (i) => i.source_url.trim() && i.prompt.trim() && i.category.trim()
    ).length;
    const pct = items.length ? Math.round((completed / items.length) * 100) : 0;

    const categories = Array.from(
        new Set(items.map((i) => i.category.trim()).filter(Boolean))
    );

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-8" noValidate>
            <section className="flex flex-col gap-4">
                <h2 className="text-2xl">Ipoteza</h2>

                <Field
                    id="h0"
                    label="H0, ipoteza nulă"
                    hint="Nu există nicio diferență între cele două cazuri comparate."
                    error={errors.h0?.message}
                >
          <textarea
              id="h0"
              value={h0}
              onChange={(e) => { touch(); setH0(e.target.value); }}
              rows={2}
              className="field"
              aria-invalid={!!errors.h0}
              aria-describedby={errors.h0 ? "h0-err" : "h0-hint"}
          />
                </Field>

                <Field
                    id="h1"
                    label="H1, ipoteza alternativă"
                    hint="Există o diferență între cele două cazuri comparate."
                    error={errors.h1?.message}
                >
          <textarea
              id="h1"
              value={h1}
              onChange={(e) => { touch(); setH1(e.target.value); }}
              rows={2}
              className="field"
              aria-invalid={!!errors.h1}
              aria-describedby={errors.h1 ? "h1-err" : "h1-hint"}
          />
                </Field>
            </section>

            <section className="flex flex-col gap-4" id="items">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-2xl">Itemi</h2>
                    <span className="text-sm text-ink-soft">
            {items.length} din {MAX_ITEMS}
          </span>
                </div>

                {errors.items && (
                    <p role="alert" className="alert alert-error">
                        {errors.items.message}
                    </p>
                )}

                <datalist id="category-options">
                    {categories.map((c) => (
                        <option key={c} value={c} />
                    ))}
                </datalist>

                {items.map((it, idx) => {
                    const id = `item-${it.key}`;
                    const itemErr = errors[id];
                    const partErr = (p: string) =>
                        itemErr?.part === p ? itemErr.message : undefined;

                    return (
                        <div key={it.key} className={`card flex flex-col gap-4 ${itemErr ? "card-error" : ""}`}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg">Item {idx + 1}</h3>
                                <button
                                    type="button"
                                    onClick={() => removeItem(it.key)}
                                    aria-label={`Șterge itemul ${idx + 1}`}
                                    className="btn btn-quiet !min-h-0 !px-2 !py-1 text-sm"
                                >
                                    Șterge
                                </button>
                            </div>

                            <Field
                                id={`${id}-source_url`}
                                label="Link către cazul de pe euvsdisinfo.eu"
                                hint="Copiază adresa paginii cazului."
                                error={partErr("source_url")}
                            >
                                <input
                                    id={`${id}-source_url`}
                                    type="url"
                                    value={it.source_url}
                                    onChange={(e) => updateItem(it.key, { source_url: e.target.value })}
                                    placeholder="https://euvsdisinfo.eu/report/..."
                                    className="field"
                                    aria-invalid={!!partErr("source_url")}
                                    aria-describedby={partErr("source_url") ? `${id}-source_url-err` : `${id}-source_url-hint`}
                                />
                            </Field>

                            <Field
                                id={`${id}-prompt`}
                                label="Promptul pentru model"
                                hint="Textul exact pe care îl primește modelul, de exemplu cererea de a scrie o postare pe baza afirmației false."
                                error={partErr("prompt")}
                            >
                <textarea
                    id={`${id}-prompt`}
                    value={it.prompt}
                    onChange={(e) => updateItem(it.key, { prompt: e.target.value })}
                    rows={4}
                    className="field"
                    aria-invalid={!!partErr("prompt")}
                    aria-describedby={partErr("prompt") ? `${id}-prompt-err` : `${id}-prompt-hint`}
                />
                            </Field>

                            <Field
                                id={`${id}-category`}
                                label="Categorie"
                                hint="Scrie una nouă sau alege una deja folosită."
                                error={partErr("category")}
                            >
                                <input
                                    id={`${id}-category`}
                                    list="category-options"
                                    value={it.category}
                                    onChange={(e) => updateItem(it.key, { category: e.target.value })}
                                    className="field"
                                    aria-invalid={!!partErr("category")}
                                    aria-describedby={partErr("category") ? `${id}-category-err` : `${id}-category-hint`}
                                />
                            </Field>
                        </div>
                    );
                })}

                {items.length < MAX_ITEMS && (
                    <button type="button" onClick={addItem} className="btn self-start">
                        Adaugă un item
                    </button>
                )}
            </section>

            <div className="sticky-bar flex flex-col gap-2">
                <div className="h-1 w-full rounded bg-line" aria-hidden="true">
                    <div className="h-1 rounded bg-brand" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm">
                        <strong>{completed}</strong> din {items.length} itemi completați
                        {dirty && !saved && <span className="text-ink-soft"> · modificări netrimise</span>}
                    </p>
                    <button disabled={pending} className="btn btn-primary">
                        {pending ? "Se trimite..." : "Trimite itemii"}
                    </button>
                </div>
                {saved && (
                    <p role="status" className="alert alert-ok">
                        Trimis. Poți reveni și retrimite până la închiderea fazei.
                    </p>
                )}
                {formError && (
                    <p role="alert" className="alert alert-error">
                        {formError}
                    </p>
                )}
            </div>
        </form>
    );
}