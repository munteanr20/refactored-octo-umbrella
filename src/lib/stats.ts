export type BinaryAgreement = {
    n: number;
    percentAgreement: number;
    validRate: number;
    kappa: number | null; // Fleiss, 2 ratings per item
    ac1: number | null; // Gwet's AC1
};

// validCounts[i] = how many of the 2 validators marked item i as valid (0, 1 or 2).
export function binaryAgreement(validCounts: number[]): BinaryAgreement | null {
    const n = validCounts.length;
    if (n === 0) return null;

    let agree = 0;
    let totalValid = 0;
    for (const c of validCounts) {
        totalValid += c;
        if (c === 0 || c === 2) agree++;
    }

    const po = agree / n;
    const pi = totalValid / (2 * n); // overall proportion of "valid"

    const peKappa = pi * pi + (1 - pi) * (1 - pi);
    const peAc1 = 2 * pi * (1 - pi);

    return {
        n,
        percentAgreement: po,
        validRate: pi,
        kappa: peKappa === 1 ? null : (po - peKappa) / (1 - peKappa),
        ac1: (po - peAc1) / (1 - peAc1),
    };
}

export type IccResult = {
    n: number;
    icc1: number | null; // single rater
    icc1k: number | null; // mean of the 2 raters
};

// One-way random-effects ICC, k = 2 ratings per item.
export function iccOneWay(pairs: [number, number][]): IccResult | null {
    const n = pairs.length;
    const k = 2;
    if (n < 2) return null;

    const means = pairs.map(([a, b]) => (a + b) / 2);
    const grand = means.reduce((s, m) => s + m, 0) / n;

    const msb = (k * means.reduce((s, m) => s + (m - grand) ** 2, 0)) / (n - 1);
    const msw =
        pairs.reduce(
            (s, [a, b], i) => s + (a - means[i]) ** 2 + (b - means[i]) ** 2,
            0
        ) /
        (n * (k - 1));

    const denom = msb + (k - 1) * msw;

    return {
        n,
        icc1: denom === 0 ? null : (msb - msw) / denom,
        icc1k: msb === 0 ? null : (msb - msw) / msb,
    };
}

export function fmt(value: number | null, digits = 2): string {
    return value === null ? "n/a" : value.toFixed(digits);
}