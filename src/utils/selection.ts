import { poolFor, type Fact, type FactKey } from '../data/facts';
import { isAttempted, isDue, type FactStats } from './factProgress';
import type { Question, Rng } from './mathEngine';

export type FactBucket = 'priority' | 'new' | 'review' | 'rest';

const PRIORITY_SHARE = 0.6;
const NEW_SHARE = 0.3;

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
function weakestFirst(items: Fact[], facts: Facts, rng: Rng): Fact[] {
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

/**
 * Orders questions so that no more than two additions/subtractions come in a row
 * (when the mix allows it) and the same fact never appears twice in a row.
 */
function interleave(questions: Question[], rng: Rng): Question[] {
    const opOf = (q: Question) => (q.kind === 'diff' ? '-' : '+');
    const groups: Record<'+' | '-', Question[]> = {
        '+': shuffle(questions.filter((q) => opOf(q) === '+'), rng),
        '-': shuffle(questions.filter((q) => opOf(q) === '-'), rng),
    };
    const memo = new Map<string, boolean>();
    const feasible = (plus: number, minus: number, last: '+' | '-' | null, run: number): boolean => {
        if (plus + minus === 0) return true;
        const id = `${plus},${minus},${last},${run}`;
        const known = memo.get(id);
        if (known !== undefined) return known;
        let ok = false;
        for (const t of ['+', '-'] as const) {
            if ((t === '+' ? plus : minus) === 0) continue;
            const nextRun = t === last ? run + 1 : 1;
            if (nextRun > 2) continue;
            if (feasible(plus - (t === '+' ? 1 : 0), minus - (t === '-' ? 1 : 0), t, nextRun)) {
                ok = true;
                break;
            }
        }
        memo.set(id, ok);
        return ok;
    };

    const out: Question[] = [];
    let last: '+' | '-' | null = null;
    let run = 0;
    while (groups['+'].length + groups['-'].length > 0) {
        const types = (['+', '-'] as const).filter((t) => groups[t].length > 0 && !(t === last && run >= 2));
        const good = types.filter((t) =>
            feasible(
                groups['+'].length - (t === '+' ? 1 : 0),
                groups['-'].length - (t === '-' ? 1 : 0),
                t,
                t === last ? run + 1 : 1,
            ),
        );
        const options = good.length > 0 ? good : types.length > 0 ? types : (['+', '-'] as const).filter((t) => groups[t].length > 0);
        const weight = options.reduce((sum, t) => sum + groups[t].length, 0);
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
function separateRepeats(items: Question[]): Question[] {
    const out = [...items];
    const clashes = (i: number) =>
        [i - 1, i].some((k) => k >= 0 && k + 1 < out.length && out[k].factKey === out[k + 1].factKey);
    for (let i = 1; i < out.length; i++) {
        if (out[i].factKey !== out[i - 1].factKey) continue;
        for (let j = 0; j < out.length; j++) {
            if (j === i || Math.abs(j - i) === 0) continue;
            [out[i], out[j]] = [out[j], out[i]];
            if (!clashes(i) && !clashes(j)) break;
            [out[i], out[j]] = [out[j], out[i]];
        }
    }
    return out;
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

    const buckets: Record<FactBucket, Fact[]> = { priority: [], new: [], review: [], rest: [] };
    for (const fact of pool) buckets[bucketOf(facts[fact.key], today)].push(fact);
    buckets.priority = weakestFirst(buckets.priority, facts, rng);
    buckets.new = shuffle(buckets.new, rng);
    buckets.review = shuffle(buckets.review, rng);
    buckets.rest = weakestFirst(buckets.rest, facts, rng);

    const priorityWant = Math.round(count * PRIORITY_SHARE);
    const newWant = Math.round(count * NEW_SHARE);
    const want: Record<'priority' | 'new' | 'review', number> = {
        priority: priorityWant,
        new: newWant,
        review: Math.max(0, count - priorityWant - newWant),
    };

    const picked: Fact[] = [];
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

    const questions = picked.map((fact) => questionFromFact(skillId, fact, kindFor(skillId, fact, rng)));
    return interleave(questions, rng);
}

export const BLITZ_SKILL_ID = 'k_blitz';
const BLITZ_MIN_ATTEMPTED = 10;

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
