export type FactKey = string; // add: `${a}+${b}`; sub: `${m}-${s}` (m = minuend = a+b, s = subtrahend = a)

export interface Fact {
    key: FactKey;
    op: '+' | '-';
    /** '+' : first addend. '-' : the subtrahend (a family partner of the addition a+b). */
    a: number;
    /** '+' : second addend. '-' : the answer. */
    b: number;
    sum: number; // a + b (the minuend for '-')
}

export function factKey(op: '+' | '-', a: number, b: number): FactKey {
    return op === '+' ? `${a}+${b}` : `${a + b}-${a}`;
}

function makeFact(op: '+' | '-', a: number, b: number): Fact {
    return { key: factKey(op, a, b), op, a, b, sum: a + b };
}

const inRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= 9;

export function parseFactKey(k: string): Fact | null {
    const m = /^(\d+)([+-])(\d+)$/.exec(k);
    if (!m) return null;
    const x = Number(m[1]);
    const y = Number(m[3]);
    if (m[2] === '+') return inRange(x) && inRange(y) && k === factKey('+', x, y) ? makeFact('+', x, y) : null;
    // x = minuend, y = subtrahend (= a), answer b = x - y
    const b = x - y;
    return inRange(y) && inRange(b) && k === factKey('-', y, b) ? makeFact('-', y, b) : null;
}

function buildAll(): Fact[] {
    const out: Fact[] = [];
    for (const op of ['+', '-'] as const) {
        for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) out.push(makeFact(op, a, b));
    }
    return out;
}

export const allFacts: Fact[] = buildAll();
export const factsByKey: Record<FactKey, Fact> = Object.fromEntries(allFacts.map((f) => [f.key, f]));

const adds = allFacts.filter((f) => f.op === '+');
const subs = allFacts.filter((f) => f.op === '-');

const POOLS: Record<string, Fact[]> = {
    k_add_5: adds.filter((f) => f.sum <= 5),
    k_sub_5: subs.filter((f) => f.sum <= 5),
    k_plus12: adds.filter((f) => f.a <= 2 || f.b <= 2),
    k_doubles: adds.filter((f) => f.a === f.b),
    k_make10: adds.filter((f) => f.sum === 10),
    k_add_10: adds.filter((f) => f.sum <= 10),
    k_sub_10: subs.filter((f) => f.sum <= 10),
    k_family_10: allFacts.filter((f) => f.sum <= 10),
    k_near_doubles: adds.filter((f) => Math.abs(f.a - f.b) === 1 && Math.min(f.a, f.b) >= 3 && Math.min(f.a, f.b) <= 8),
    k_plus89: adds.filter((f) => (f.a >= 8 && f.b >= 2) || (f.b >= 8 && f.a >= 2)),
    k_add_11_18: adds.filter((f) => f.sum >= 11),
    k_sub_11_18: subs.filter((f) => f.sum >= 11),
    k_mixed: allFacts,
    // k_review: every fact; the selection narrows it to the facts the user has attempted.
    k_review: allFacts,
};

/** Ids of the ladder pools in ladder order (excludes k_review). */
export const LADDER_POOL_IDS = [
    'k_add_5', 'k_sub_5', 'k_plus12', 'k_doubles', 'k_make10', 'k_add_10', 'k_sub_10',
    'k_family_10', 'k_near_doubles', 'k_plus89', 'k_add_11_18', 'k_sub_11_18', 'k_mixed',
] as const;

export function poolFor(skillId: string): Fact[] {
    return POOLS[skillId] ?? [];
}
