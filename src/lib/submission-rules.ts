export const MIN_ITEMS = 1; // set to 20 if the teacher wants exactly 20
export const MAX_ITEMS = 20;
export const MAX_HYPOTHESIS = 1000;
export const MAX_PROMPT = 2000;
export const MAX_CATEGORY = 100;

export type HypothesisType = "A" | "B" | "C";

export const HYPOTHESIS_TYPES: { value: HypothesisType; title: string; text: string }[] = [
    {
        value: "A",
        title: "Model împotriva modelului",
        text: "Modelul X are o rată de acceptare diferită decât Modelul Y la formularea de mesaje de dezinformare.",
    },
    {
        value: "B",
        title: "Prompt împotriva promptului",
        text: "Prompt-ul X are o rată de acceptare diferită decât Prompt-ul Y la formularea de mesaje de dezinformare de către modelul W.",
    },
    {
        value: "C",
        title: "Tip de dezinformare împotriva altui tip",
        text: "Dezinformările de tip X au o rată de acceptare diferită decât dezinformările de tip Y în formularea de mesaj de dezinformare de către modelul W.",
    },
];

export function isHypothesisType(value: string): value is HypothesisType {
    return value === "A" || value === "B" || value === "C";
}

// Every item carries a category (the "Tag" from EUvsDisinfo), whatever the hypothesis type.
// A and B: all items share one category. C: items split between two categories.
export const MAX_CATEGORIES_TYPE_C = 2;

export function categoryHint(type: string | null) {
    if (type === "C")
        return "Tag-ul din EUvsDisinfo. La acest tip de ipoteză folosești două categorii: 10 itemi dintr-una și 10 din cealaltă.";
    if (type === "A" || type === "B")
        return "Tag-ul din EUvsDisinfo. La acest tip de ipoteză toți itemii au aceeași categorie.";
    return "Tag-ul din EUvsDisinfo. Alege mai întâi tipul ipotezei.";
}

export type ItemInput = {
    source_url: string;
    prompt: string;
    category: string;
};

export type ItemPart = "source_url" | "prompt" | "category";
export type FieldError = { field: string; message: string; part?: ItemPart };

export function isEuvsdisinfoUrl(raw: string) {
    try {
        const url = new URL(raw);
        if (url.protocol !== "https:" && url.protocol !== "http:") return false;
        const host = url.hostname.toLowerCase();
        return host === "euvsdisinfo.eu" || host.endsWith(".euvsdisinfo.eu");
    } catch {
        return false;
    }
}

// field is "type", "h0", "h1", "items", or "item-<index>"
export function validateSubmission(
    type: string,
    h0: string,
    h1: string,
    items: ItemInput[]
): FieldError[] {
    const errors: FieldError[] = [];

    if (!isHypothesisType(type)) {
        errors.push({ field: "type", message: "Alege tipul ipotezei (A, B sau C)." });
    }

    if (!h0.trim()) errors.push({ field: "h0", message: "Scrie ipoteza nulă (H0)." });
    else if (h0.length > MAX_HYPOTHESIS)
        errors.push({ field: "h0", message: "H0 este prea lungă." });

    if (!h1.trim()) errors.push({ field: "h1", message: "Scrie ipoteza alternativă (H1)." });
    else if (h1.length > MAX_HYPOTHESIS)
        errors.push({ field: "h1", message: "H1 este prea lungă." });

    if (items.length < MIN_ITEMS || items.length > MAX_ITEMS) {
        errors.push({
            field: "items",
            message: `Trimite între ${MIN_ITEMS} și ${MAX_ITEMS} itemi.`,
        });
    }

    items.forEach((it, idx) => {
        const field = `item-${idx}`;
        if (!it.source_url.trim()) {
            errors.push({ field, part: "source_url", message: "Adaugă linkul cazului." });
        } else if (!isEuvsdisinfoUrl(it.source_url.trim())) {
            errors.push({ field, part: "source_url", message: "Linkul trebuie să fie de pe euvsdisinfo.eu." });
        } else if (!it.prompt.trim()) {
            errors.push({ field, part: "prompt", message: "Scrie afirmația." });
        } else if (it.prompt.length > MAX_PROMPT) {
            errors.push({ field, part: "prompt", message: "Afirmația este prea lungă." });
        } else if (!it.category.trim()) {
            errors.push({ field, part: "category", message: "Scrie categoria itemului." });
        } else if (it.category.length > MAX_CATEGORY) {
            errors.push({ field, part: "category", message: "Categoria este prea lungă." });
        }
    });

    // Category consistency across items (only when every item already has a category).
    const cats = items.map((it) => it.category.trim().toLowerCase()).filter(Boolean);
    const distinct = new Set(cats);
    if (isHypothesisType(type) && cats.length === items.length && items.length > 0) {
        if ((type === "A" || type === "B") && distinct.size > 1) {
            errors.push({
                field: "categories",
                message: "La ipotezele de tip A și B toți itemii trebuie să aibă aceeași categorie.",
            });
        }
        if (type === "C" && distinct.size > MAX_CATEGORIES_TYPE_C) {
            errors.push({
                field: "categories",
                message: "La ipotezele de tip C folosești cel mult două categorii.",
            });
        }
    }

    return errors;
}