import { poolFor, type Fact, type FactKey } from '../data/facts';
import { tablePoolFor, type TableFact } from '../data/tableFacts';
import { isAttempted, isDue, type FactStats } from './factProgress';
import type { Question, Rng } from './mathEngine';

export type FactBucket = 'priority' | 'new' | 'review' | 'rest';

const PRIORITY_SHARE = 0.6;
const NEW_SHARE = 0.3;

export const BLITZ_SKILL_ID = 'k_blitz';
const BLITZ_MIN_ATTEMPTED = 10;

/** Share of addition facts shown as `a + ? = c`, per skill. */
const MISSING_SHARE: Record<string, number> = {
    k_make10: 0.5,
    k_family_10: 0.25,
    k_mixed: 0.25,
    k_review: 0.25,
};

type Facts = Record<FactKey, FactStats>;

function shuffle<T>(items: T[], rng: Rng): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/** Shuffled, then stable-sorted by box so the weakest come first and ties stay random. */
function weakestFirst<T extends { key: string }>(items: T[], facts: Facts, rng: Rng): T[] {
    return shuffle(items, rng).sort((x, y) => (facts[x.key]?.box ?? 0) - (facts[y.key]?.box ?? 0));
}

export function bucketOf(stats: FactStats | undefined, today: string): FactBucket {
    if (!isAttempted(stats)) return 'new';
    const due = isDue(stats, today);
    if ((due && stats.box <= 1) || stats.lastWrong === true) return 'priority';
    if (due && stats.box >= 2) return 'review';
    return 'rest';
}

export function questionFromFact(skillId: string, fact: Fact, kind: 'sum' | 'diff' | 'missing'): Question {
    const key = `${skillId}:${fact.key}:${kind}`;
    if (kind === 'diff') {
        return { skillId, operator: '-', left: fact.sum, right: fact.a, result: null, answer: fact.b, key, factKey: fact.key, kind };
    }
    if (kind === 'missing') {
        return { skillId, operator: '+', left: fact.a, right: null, result: fact.sum, answer: fact.b, key, factKey: fact.key, kind };
    }
    return { skillId, operator: '+', left: fact.a, right: fact.b, result: null, answer: fact.sum, key, factKey: fact.key, kind };
}

function kindFor(skillId: string, fact: Fact, rng: Rng): 'sum' | 'diff' | 'missing' {
    if (fact.op === '-') return 'diff';
    return rng() < (MISSING_SHARE[skillId] ?? 0) ? 'missing' : 'sum';
}

type Group = 0 | 1;
const GROUPS: readonly Group[] = [0, 1];

/**
 * Orders questions so that no more than two of the same group (kinder: additions/subtractions,
 * tables: multiplications/divisions) come in a row (when the mix allows it) and the same fact
 * never appears twice in a row.
 */
function interleave(questions: Question[], rng: Rng, groupOf: (q: Question) => Group): Question[] {
    const groups: Record<Group, Question[]> = {
        0: shuffle(questions.filter((q) => groupOf(q) === 0), rng),
        1: shuffle(questions.filter((q) => groupOf(q) === 1), rng),
    };
    const memo = new Map<string, boolean>();
    const feasible = (zero: number, one: number, last: Group | null, run: number): boolean => {
        if (zero + one === 0) return true;
        const id = `${zero},${one},${last},${run}`;
        const known = memo.get(id);
        if (known !== undefined) return known;
        let ok = false;
        for (const t of GROUPS) {
            if ((t === 0 ? zero : one) === 0) continue;
            const nextRun = t === last ? run + 1 : 1;
            if (nextRun > 2) continue;
            if (feasible(zero - (t === 0 ? 1 : 0), one - (t === 1 ? 1 : 0), t, nextRun)) {
                ok = true;
                break;
            }
        }
        memo.set(id, ok);
        return ok;
    };

    const out: Question[] = [];
    let last: Group | null = null;
    let run = 0;
    while (groups[0].length + groups[1].length > 0) {
        const types = GROUPS.filter((t) => groups[t].length > 0 && !(t === last && run >= 2));
        const good = types.filter((t) =>
            feasible(
                groups[0].length - (t === 0 ? 1 : 0),
                groups[1].length - (t === 1 ? 1 : 0),
                t,
                t === last ? run + 1 : 1,
            ),
        );
        const options = good.length > 0 ? good : types.length > 0 ? types : GROUPS.filter((t) => groups[t].length > 0);
        const weight = options.reduce<number>((sum, t) => sum + groups[t].length, 0);
        let roll = rng() * weight;
        let type = options[options.length - 1];
        for (const t of options) {
            roll -= groups[t].length;
            if (roll < 0) {
                type = t;
                break;
            }
        }
        const lastFact = out[out.length - 1]?.factKey;
        const index = Math.max(0, groups[type].findIndex((q) => q.factKey !== lastFact));
        const [q] = groups[type].splice(index, 1);
        out.push(q);
        run = type === last ? run + 1 : 1;
        last = type;
    }
    return separateRepeats(out);
}

/** Swaps questions around until the same fact is never next to itself (only needed when facts repeat). */
export function separateRepeats(items: Question[]): Question[] {
    const out = [...items];
    const clashCount = () => out.reduce((n, q, i) => n + (i > 0 && q.factKey === out[i - 1].factKey ? 1 : 0), 0);
    let clashes = clashCount();
    for (let pass = 0; pass < out.length * out.length && clashes > 0; pass++) {
        let improved = false;
        for (let i = 1; i < out.length && !improved; i++) {
            if (out[i].factKey !== out[i - 1].factKey) continue;
            for (let j = 0; j < out.length; j++) {
                if (j === i || out[j].factKey === out[i].factKey) continue;
                [out[i], out[j]] = [out[j], out[i]];
                const after = clashCount();
                if (after < clashes) {
                    clashes = after;
                    improved = true;
                    break;
                }
                [out[i], out[j]] = [out[j], out[i]];
            }
        }
        if (!improved) break;
    }
    return out;
}

/** Splits a session size 60/30/10 with the largest-remainder method (exactly 6/3/1 for 10). */
export function splitCount(count: number): Record<'priority' | 'new' | 'review', number> {
    const exact = { priority: count * PRIORITY_SHARE, new: count * NEW_SHARE, review: count * (1 - PRIORITY_SHARE - NEW_SHARE) };
    const out = { priority: Math.floor(exact.priority + 1e-9), new: Math.floor(exact.new + 1e-9), review: Math.floor(exact.review + 1e-9) };
    let left = count - out.priority - out.new - out.review;
    const order = (['priority', 'new', 'review'] as const)
        .map((k) => ({ k, rem: exact[k] - out[k] }))
        .sort((x, y) => y.rem - x.rem);
    for (let i = 0; left > 0; i = (i + 1) % order.length, left--) out[order[i].k]++;
    return out;
}

/**
 * The shared 60/30/10 picker: 60% weak/due facts, 30% unseen, 10% due reviews (empty buckets hand
 * their share to the others), then the weakest remaining facts; repeats when the pool is smaller
 * than the session. Pure apart from the injected rng.
 */
function pickFacts<T extends { key: string }>(pool: T[], facts: Facts, today: string, count: number, rng: Rng): T[] {
    const buckets: Record<FactBucket, T[]> = { priority: [], new: [], review: [], rest: [] };
    for (const fact of pool) buckets[bucketOf(facts[fact.key], today)].push(fact);
    buckets.priority = weakestFirst(buckets.priority, facts, rng);
    buckets.new = shuffle(buckets.new, rng);
    buckets.review = shuffle(buckets.review, rng);
    buckets.rest = weakestFirst(buckets.rest, facts, rng);

    const want = splitCount(count);

    const picked: T[] = [];
    const taken: Record<'priority' | 'new' | 'review', number> = { priority: 0, new: 0, review: 0 };
    const order = ['priority', 'new', 'review'] as const;
    for (const name of order) {
        const n = Math.min(want[name], buckets[name].length);
        picked.push(...buckets[name].slice(0, n));
        taken[name] = n;
    }
    // Redistribute what the short buckets could not give.
    for (const name of order) {
        const missing = count - picked.length;
        if (missing <= 0) break;
        const extra = buckets[name].slice(taken[name], taken[name] + missing);
        picked.push(...extra);
        taken[name] += extra.length;
    }
    // Everything due is used: take the weakest of the rest.
    if (picked.length < count) picked.push(...buckets.rest.slice(0, count - picked.length));
    // Pool smaller than the session: repeat facts (never twice in a row, see interleave).
    const unique = picked.length;
    for (let i = 0; picked.length < count && unique > 0; i++) picked.push(picked[i % unique]);
    return picked;
}

/**
 * Builds a kinder practice session from the skill's fact pool: 60% weak/due facts,
 * 30% unseen, 10% due reviews (empty buckets hand their share to the others), then the
 * weakest remaining facts. Pure apart from the injected rng.
 */
export function buildKinderSession(skillId: string, facts: Facts, today: string, count: number, rng: Rng): Question[] {
    const full = poolFor(skillId);
    if (full.length === 0) throw new Error(`Unknown kinder skill: ${skillId}`);
    let pool = skillId === 'k_review' ? full.filter((f) => isAttempted(facts[f.key])) : full;
    if (pool.length === 0) pool = poolFor('k_add_10'); // review with no history: nothing sensible to review

    const picked = pickFacts(pool, facts, today, count, rng);
    const questions = picked.map((fact) => questionFromFact(skillId, fact, kindFor(skillId, fact, rng)));
    return interleave(questions, rng, (q) => (q.kind === 'diff' ? 1 : 0));
}

// ---------- times tables (grade 4) ----------

/** Share of facts shown in a missing-factor form (`a x ? = p`, `p / ? = q`), per table skill. */
export const TABLE_MISSING_SHARE: Record<string, number> = {
    g_xmix: 0.25,
    g_dmix: 0.25,
    g_d25: 0.25,
    g_d34: 0.25,
    g_d69: 0.25,
    g_review: 0.25,
};

/** Division skills that only ever show the missing form as `d x ? = p` (links x and /). */
const MISSING_AS_MUL = ['g_d25', 'g_d34', 'g_d69'];

export type TableForm = 'direct' | 'missingMul' | 'missingDiv';

export function questionFromTableFact(skillId: string, fact: TableFact, form: TableForm): Question {
    const base = { skillId, factKey: fact.key };
    if (fact.op === '×') {
        // a missing form hides the second factor: a x ? = p
        if (form !== 'direct') return { ...base, operator: '×', left: fact.a, right: null, result: fact.product, answer: fact.b, key: `${skillId}:${fact.key}:missing`, kind: 'missing' };
        return { ...base, operator: '×', left: fact.a, right: fact.b, result: null, answer: fact.product, key: `${skillId}:${fact.key}:prod`, kind: 'prod' };
    }
    if (form === 'missingMul') {
        // d x ? = p  (answer: the quotient)
        return { ...base, operator: '×', left: fact.a, right: null, result: fact.product, answer: fact.b, key: `${skillId}:${fact.key}:missingMul`, kind: 'missing' };
    }
    if (form === 'missingDiv') {
        // p / ? = q  (answer: the divisor)
        return { ...base, operator: '÷', left: fact.product, right: null, result: fact.b, answer: fact.a, key: `${skillId}:${fact.key}:missingDiv`, kind: 'missing' };
    }
    return { ...base, operator: '÷', left: fact.product, right: fact.a, result: null, answer: fact.b, key: `${skillId}:${fact.key}:quot`, kind: 'quot' };
}

function tableFormFor(skillId: string, fact: TableFact, rng: Rng): TableForm {
    if (rng() >= (TABLE_MISSING_SHARE[skillId] ?? 0)) return 'direct';
    if (fact.op === '×') return 'missingMul';
    if (MISSING_AS_MUL.includes(skillId)) return 'missingMul';
    return rng() < 0.5 ? 'missingMul' : 'missingDiv';
}

export const TABLE_FALLBACK_SKILL = 'g_x25';

/**
 * Times-table session (grade 4): same 60/30/10 algorithm as the kinder session, over the table
 * facts of `skillId`. `g_review` uses only attempted facts (the g_x25 facts when there is no history).
 */
export function buildFactSession(skillId: string, facts: Facts, today: string, count: number, rng: Rng): Question[] {
    const full = tablePoolFor(skillId);
    if (full.length === 0) throw new Error(`Unknown table skill: ${skillId}`);
    let pool = skillId === 'g_review' ? full.filter((f) => isAttempted(facts[f.key])) : full;
    if (pool.length === 0) pool = tablePoolFor(TABLE_FALLBACK_SKILL);

    const picked = pickFacts(pool, facts, today, count, rng);
    const questions = picked.map((fact) => questionFromTableFact(skillId, fact, tableFormFor(skillId, fact, rng)));
    return interleave(questions, rng, (q) => (q.factKey?.includes('/') ? 1 : 0));
}


/** Quick-fire questions for the blitz: the user's attempted facts (or `k_add_10` while there are few). */
export function buildBlitzQuestions(facts: Facts, rng: Rng, count: number): Question[] {
    const attempted = poolFor('k_review').filter((f) => isAttempted(facts[f.key]));
    const pool = attempted.length >= BLITZ_MIN_ATTEMPTED ? attempted : poolFor('k_add_10');
    const out: Question[] = [];
    let previous = '';
    for (let i = 0; i < count; i++) {
        const candidates = pool.length > 1 ? pool.filter((f) => f.key !== previous) : pool;
        const fact = candidates[Math.floor(rng() * candidates.length)];
        previous = fact.key;
        out.push(questionFromFact(BLITZ_SKILL_ID, fact, fact.op === '-' ? 'diff' : 'sum'));
    }
    return out;
}

/** Quick-fire table questions for the grade 4 blitz: attempted table facts (>= 10) else the g_x25 facts. */
export function buildTableBlitzQuestions(facts: Facts, rng: Rng, count: number): Question[] {
    const attempted = tablePoolFor('g_review').filter((f) => isAttempted(facts[f.key]));
    const pool = attempted.length >= BLITZ_MIN_ATTEMPTED ? attempted : tablePoolFor(TABLE_FALLBACK_SKILL);
    const out: Question[] = [];
    let previous = '';
    for (let i = 0; i < count; i++) {
        const candidates = pool.length > 1 ? pool.filter((f) => f.key !== previous) : pool;
        const fact = candidates[Math.floor(rng() * candidates.length)];
        previous = fact.key;
        out.push(questionFromTableFact(BLITZ_SKILL_ID, fact, 'direct'));
    }
    return out;
}
