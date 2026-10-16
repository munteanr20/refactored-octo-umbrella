export const MIN_ITEMS = 1; // set to 20 if the teacher wants exactly 20
export const MAX_ITEMS = 20;
export const MAX_HYPOTHESIS = 1000;
export const MAX_PROMPT = 2000;
export const MAX_CATEGORY = 100;

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

// field is "h0", "h1", "items", or "item-<index>"
export function validateSubmission(
    h0: string,
    h1: string,
    items: ItemInput[]
): FieldError[] {
    const errors: FieldError[] = [];

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
            errors.push({ field, part: "prompt", message: "Scrie promptul." });
        } else if (it.prompt.length > MAX_PROMPT) {
            errors.push({ field, part: "prompt", message: "Promptul este prea lung." });
        } else if (!it.category.trim()) {
            errors.push({ field, part: "category", message: "Alege sau scrie o categorie." });
        } else if (it.category.length > MAX_CATEGORY) {
            errors.push({ field, part: "category", message: "Categoria este prea lungă." });
        }
    });

    return errors;
}