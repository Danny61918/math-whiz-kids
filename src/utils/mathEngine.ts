export interface Question {
    skillId: string;
    operator: '+' | '-' | '×' | '÷';
    left: number | null; // null = unknown slot
    right: number | null;
    result: number | null; // only shown for k_make10
    answer: number;
    remainder?: number; // division only
    key: string;
    /** Kinder fact questions only: the underlying fact (the addition fact for `a + ? = c`). */
    factKey?: string;
    kind?: 'sum' | 'diff' | 'missing' | 'prod' | 'quot';
}

export type Rng = () => number;

type Draft = Omit<Question, 'skillId' | 'key'>;

export interface SkillSpec {
    make: (rng: Rng) => Draft;
    accept: (d: Draft) => boolean;
    fallback: (rng: Rng) => Draft;
}

const MAX_ATTEMPTS = 100;

// ---------- number helpers ----------

function randInt(rng: Rng, min: number, max: number): number {
    return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: Rng, items: T[]): T {
    return items[Math.floor(rng() * items.length)];
}

function digitCount(n: number): number {
    return String(n).length;
}

function hardDigitCount(n: number): number {
    return (String(n).match(/[6-9]/g) ?? []).length;
}

/**
 * A "nicer" random integer with the given digit count: no trailing zero and
 * (best effort) at least half of its digits are hard ones (6-9).
 * One-digit numbers are 2..9, weighted towards 6..9.
 */
function interestingInt(rng: Rng, digits: number): number {
    if (digits === 1) {
        return pick(rng, [2, 3, 4, 5, 6, 7, 8, 9, 6, 7, 8, 9]);
    }
    const min = 10 ** (digits - 1);
    const max = 10 ** digits - 1;
    let n = randInt(rng, min, max);
    for (let i = 0; i < 20; i++) {
        if (n % 10 !== 0 && hardDigitCount(n) >= digits / 2) return n;
        n = randInt(rng, min, max);
    }
    return n % 10 === 0 ? n + randInt(rng, 1, 9) : n;
}

/** Number with `digits` digits whose lowest `k` digits are each within lo..hi. */
function numWithLowDigits(rng: Rng, digits: number, k: number, lo: number, hi: number): number {
    let n = randInt(rng, 10 ** (digits - k - 1), 10 ** (digits - k) - 1);
    for (let i = 0; i < k; i++) n = n * 10 + randInt(rng, lo, hi);
    return n;
}

export function countCarries(a: number, b: number): number {
    let x = a;
    let y = b;
    let carry = 0;
    let count = 0;
    while (x > 0 || y > 0 || carry > 0) {
        const sum = (x % 10) + (y % 10) + carry;
        carry = sum >= 10 ? 1 : 0;
        count += carry;
        x = Math.floor(x / 10);
        y = Math.floor(y / 10);
    }
    return count;
}

/** Number of borrows in a - b (requires a >= b). */
export function countBorrows(a: number, b: number): number {
    let x = a;
    let y = b;
    let borrow = 0;
    let count = 0;
    while (x > 0 || y > 0) {
        const diff = (x % 10) - (y % 10) - borrow;
        borrow = diff < 0 ? 1 : 0;
        count += borrow;
        x = Math.floor(x / 10);
        y = Math.floor(y / 10);
    }
    return count;
}

function questionKey(skillId: string, d: Draft): string {
    const result = d.result === null ? '' : `=${d.result}`;
    return `${skillId}:${d.left ?? '?'}${d.operator}${d.right ?? '?'}${result}`;
}

// ---------- draft builders ----------

function add(left: number, right: number): Draft {
    return { operator: '+', left, right, result: null, answer: left + right };
}

function sub(left: number, right: number): Draft {
    return { operator: '-', left, right, result: null, answer: left - right };
}

function mul(left: number, right: number): Draft {
    return { operator: '×', left, right, result: null, answer: left * right };
}

function div(dividend: number, divisor: number): Draft {
    return {
        operator: '÷',
        left: dividend,
        right: divisor,
        result: null,
        answer: Math.floor(dividend / divisor),
        remainder: dividend % divisor,
    };
}

// ---------- skill specs (grade4 only; kinder uses buildKinderSession) ----------

function gradeAdd(aDigitChoices: number[], bDigitChoices: number[], carries: number): SkillSpec {
    return {
        make: (rng) =>
            add(interestingInt(rng, pick(rng, aDigitChoices)), interestingInt(rng, pick(rng, bDigitChoices))),
        accept: (d) =>
            aDigitChoices.includes(digitCount(d.left ?? 0)) &&
            bDigitChoices.includes(digitCount(d.right ?? 0)) &&
            countCarries(d.left ?? 0, d.right ?? 0) >= carries,
        fallback: (rng) =>
            add(numWithLowDigits(rng, aDigitChoices[0], carries, 5, 9), numWithLowDigits(rng, bDigitChoices[0], carries, 5, 9)),
    };
}

function gradeSub(aDigitChoices: number[], bDigitChoices: number[], borrows: number): SkillSpec {
    return {
        make: (rng) =>
            sub(interestingInt(rng, pick(rng, aDigitChoices)), interestingInt(rng, pick(rng, bDigitChoices))),
        accept: (d) =>
            aDigitChoices.includes(digitCount(d.left ?? 0)) &&
            bDigitChoices.includes(digitCount(d.right ?? 0)) &&
            d.answer > 0 &&
            countBorrows(d.left ?? 0, d.right ?? 0) >= borrows,
        // a: most digits, low digits 0..4; b: fewest digits, low digits 5..9 (so a > b and every low column borrows).
        fallback: (rng) =>
            sub(
                numWithLowDigits(rng, Math.max(...aDigitChoices), borrows, 0, 4),
                numWithLowDigits(rng, Math.min(...bDigitChoices), borrows, 5, 9),
            ),
    };
}

function gradeMul(aDigits: number, bDigits: number, fallbackDraft: Draft): SkillSpec {
    return {
        make: (rng) => mul(interestingInt(rng, aDigits), interestingInt(rng, bDigits)),
        accept: (d) => digitCount(d.left ?? 0) === aDigits && digitCount(d.right ?? 0) === bDigits,
        fallback: () => fallbackDraft,
    };
}

function gradeDiv(dividendDigits: number, divisorDigits: number, fallbackDraft: Draft): SkillSpec {
    const lo = 10 ** (dividendDigits - 1);
    const hi = 10 ** dividendDigits - 1;
    return {
        make: (rng) => {
            const divisor = interestingInt(rng, divisorDigits);
            const remainder = rng() < 0.7 ? randInt(rng, 1, divisor - 1) : 0;
            const qMin = Math.max(2, Math.ceil((lo - remainder) / divisor));
            const qMax = Math.floor((hi - remainder) / divisor);
            if (qMin > qMax) return div(0, divisor); // rejected by accept
            return div(randInt(rng, qMin, qMax) * divisor + remainder, divisor);
        },
        accept: (d) => {
            const divisor = d.right ?? 0;
            return (
                digitCount(d.left ?? 0) === dividendDigits &&
                digitCount(divisor) === divisorDigits &&
                divisor >= 2 &&
                d.answer >= 2 &&
                (d.remainder ?? divisor) < divisor
            );
        },
        fallback: () => fallbackDraft,
    };
}

export const skillSpecs: Record<string, SkillSpec> = {
    g_add_4: gradeAdd([4], [3, 4], 1),
    g_sub_4: gradeSub([4], [3, 4], 1),
    g_add_6: gradeAdd([5, 6], [5, 6], 2),
    g_sub_6: gradeSub([5, 6], [5, 6], 2),
    g_mul_21: gradeMul(2, 1, mul(47, 6)),
    g_mul_32: gradeMul(3, 2, mul(364, 27)),
    g_mul_42: gradeMul(4, 2, mul(2847, 36)),
    g_div_21: gradeDiv(2, 1, div(47, 5)),
    g_div_32: gradeDiv(3, 2, div(365, 12)),
    g_div_41: gradeDiv(4, 1, div(2347, 6)),
};

// ---------- public API ----------

/**
 * Generates one question. Pure apart from the injected rng. Unknown skill ids
 * are a programming error and throw; constraint failures never do (fallback).
 */
export function generateQuestion(skillId: string, rng: Rng = Math.random, recentKeys: string[] = []): Question {
    const spec = skillSpecs[skillId];
    if (!spec) throw new Error(`Unknown skill: ${skillId}`);

    let chosen: Draft | null = null;
    let validDuplicate: Draft | null = null;
    for (let i = 0; i < MAX_ATTEMPTS && !chosen; i++) {
        const draft = spec.make(rng);
        if (!spec.accept(draft)) continue;
        if (recentKeys.includes(questionKey(skillId, draft))) {
            validDuplicate ??= draft;
        } else {
            chosen = draft;
        }
    }
    const draft = chosen ?? validDuplicate ?? spec.fallback(rng);
    return { ...draft, skillId, key: questionKey(skillId, draft) };
}

export function generateSession(skillId: string, count: number, rng: Rng = Math.random): Question[] {
    const questions: Question[] = [];
    const keys: string[] = [];
    for (let i = 0; i < count; i++) {
        const q = generateQuestion(skillId, rng, keys);
        questions.push(q);
        keys.push(q.key);
    }
    return questions;
}

export function checkAnswer(q: Question, input: { answer: number; remainder?: number }): boolean {
    return input.answer === q.answer && (input.remainder ?? 0) === (q.remainder ?? 0);
}

export { buildKinderSession, buildBlitzQuestions, buildFactSession, buildTableBlitzQuestions } from './selection';
