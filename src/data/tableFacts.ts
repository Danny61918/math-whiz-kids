/**
 * Times-table facts (grade 4): 81 multiplication + 81 division facts.
 * Keys: x = `${a}x${b}` (a, b in 1..9, answer a*b); / = `${product}/${divisor}` (answer = quotient 1..9).
 * They never collide with the kinder keys (`a+b`, `m-s`) and live in the same per-user `facts` record.
 */
export type TableOp = '×' | '÷';

export interface TableFact {
    key: string;
    op: TableOp;
    /** ×: first factor. ÷: the divisor. */
    a: number;
    /** ×: second factor. ÷: the quotient (the answer). */
    b: number;
    /** ×: a*b (the answer). ÷: the dividend. */
    product: number;
}

/** Retrieval-time thresholds (ms) for "fast" answers. */
export const MUL_FAST_MS = 4000;
export const DIV_FAST_MS = 5000;

export function tableKey(op: TableOp, a: number, b: number): string {
    return op === '×' ? `${a}x${b}` : `${a * b}/${a}`;
}

function makeTableFact(op: TableOp, a: number, b: number): TableFact {
    return { key: tableKey(op, a, b), op, a, b, product: a * b };
}

const inRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= 9;

/** Parses a table key; null for anything that is not a canonical table key. */
export function parseTableKey(k: string): TableFact | null {
    const mul = /^(\d+)x(\d+)$/.exec(k);
    if (mul) {
        const a = Number(mul[1]);
        const b = Number(mul[2]);
        return inRange(a) && inRange(b) && k === tableKey('×', a, b) ? makeTableFact('×', a, b) : null;
    }
    const div = /^(\d+)\/(\d+)$/.exec(k);
    if (div) {
        const p = Number(div[1]);
        const d = Number(div[2]);
        if (!inRange(d) || p % d !== 0) return null;
        const q = p / d;
        return inRange(q) && k === tableKey('÷', d, q) ? makeTableFact('÷', d, q) : null;
    }
    return null;
}

export const isTableKey = (k: string): boolean => parseTableKey(k) !== null;

/** Speed threshold for a fact key: 4000 for x, 5000 for / (undefined for non-table keys). */
export function tableFastMs(key: string): number | undefined {
    const f = parseTableKey(key);
    return f ? (f.op === '×' ? MUL_FAST_MS : DIV_FAST_MS) : undefined;
}

function buildAll(): TableFact[] {
    const out: TableFact[] = [];
    for (const op of ['×', '÷'] as const) {
        for (let a = 1; a <= 9; a++) for (let b = 1; b <= 9; b++) out.push(makeTableFact(op, a, b));
    }
    return out;
}

export const allTableFacts: TableFact[] = buildAll();
export const tableFactsByKey: Record<string, TableFact> = Object.fromEntries(allTableFacts.map((f) => [f.key, f]));

const muls = allTableFacts.filter((f) => f.op === '×');
const divs = allTableFacts.filter((f) => f.op === '÷');

const hasFactor = (nums: number[]) => (f: TableFact) => nums.includes(f.a) || nums.includes(f.b);
const hasDivisor = (nums: number[]) => (f: TableFact) => nums.includes(f.a);

const TABLE_POOLS: Record<string, TableFact[]> = {
    g_x25: muls.filter(hasFactor([2, 5])),
    g_x34: muls.filter(hasFactor([3, 4])),
    g_x6: muls.filter(hasFactor([6])),
    g_x7: muls.filter(hasFactor([7])),
    g_x8: muls.filter(hasFactor([8])),
    g_x9: muls.filter(hasFactor([9])),
    g_xmix: muls,
    g_d25: divs.filter(hasDivisor([2, 5])),
    g_d34: divs.filter(hasDivisor([3, 4])),
    g_d69: divs.filter(hasDivisor([6, 7, 8, 9])),
    g_dmix: divs,
    // g_review: every table fact; the session narrows it to the attempted ones.
    g_review: allTableFacts,
};

/** Ladder skill ids of the table track, in order (excludes g_review). */
export const TABLE_LADDER_IDS = ['g_x25', 'g_x34', 'g_x6', 'g_x7', 'g_x8', 'g_x9', 'g_xmix', 'g_d25', 'g_d34', 'g_d69', 'g_dmix'] as const;

export const TABLE_REVIEW_ID = 'g_review';

export const isTableSkillId = (skillId: string): boolean => skillId in TABLE_POOLS;

export function tablePoolFor(skillId: string): TableFact[] {
    return TABLE_POOLS[skillId] ?? [];
}
