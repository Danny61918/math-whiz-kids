import { allTableFacts, tableFastMs, type TableFact } from '../data/tableFacts';
import { questionFromTableFact } from './selection';
import type { Question, Rng } from './mathEngine';

export const DIAGNOSTIC_SKILL_ID = 'g_diag';
export const DIAGNOSTIC_COUNT = 27;
const GROUPS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
const PER_GROUP = 3;
const DIVISION_QUESTIONS = 3;

/** A diagnostic question with the factor group (x1..x9) it was drawn for. */
export interface DiagnosticQuestion extends Question {
    group: number;
}

function shuffle<T>(items: T[], rng: Rng): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

const pairId = (f: TableFact) => `${Math.min(f.a, f.b)}-${Math.max(f.a, f.b)}`;

/**
 * 27 questions: 3 per factor group (x1..x9), 24 multiplications and 3 divisions, facts with both
 * operands >= 2 where possible, no commutative duplicates, direct forms only. Pure apart from the rng.
 */
export function buildDiagnosticQuestions(rng: Rng): DiagnosticQuestion[] {
    const muls = allTableFacts.filter((f) => f.op === '×');
    const divs = allTableFacts.filter((f) => f.op === '÷');
    const divGroups = new Set(shuffle([3, 4, 5, 6, 7, 8, 9], rng).slice(0, DIVISION_QUESTIONS));
    const usedPairs = new Set<string>();
    const out: DiagnosticQuestion[] = [];

    for (const g of GROUPS) {
        const picked: TableFact[] = [];
        if (divGroups.has(g)) {
            const candidates = shuffle(divs.filter((f) => f.a === g && f.b >= 2), rng);
            if (candidates.length > 0) picked.push(candidates[0]);
        }
        const hasG = muls.filter((f) => f.a === g || f.b === g);
        const preferred = shuffle(hasG.filter((f) => f.a >= 2 && f.b >= 2), rng);
        const rest = shuffle(hasG.filter((f) => f.a < 2 || f.b < 2), rng);
        for (const f of [...preferred, ...rest]) {
            if (picked.length >= PER_GROUP) break;
            if (usedPairs.has(pairId(f))) continue;
            usedPairs.add(pairId(f));
            picked.push(f);
        }
        for (const f of picked) out.push({ ...questionFromTableFact(DIAGNOSTIC_SKILL_ID, f, 'direct'), group: g });
    }
    return shuffle(out, rng);
}

export interface DiagnosticAnswer {
    question: DiagnosticQuestion;
    correct: boolean;
    retrievalMs: number;
}

export type GroupStatus = 'strong' | 'slow' | 'practice';

export interface GroupSummary {
    group: number;
    status: GroupStatus;
    wrong: number;
    slow: number;
}

export interface SlowFact {
    factKey: string;
    equation: string;
    seconds: number;
}

export interface DiagnosticSummary {
    groups: GroupSummary[];
    /** The groups to practise first: those answered wrongly (most mistakes first), else the slow ones. */
    focus: number[];
    slowFacts: SlowFact[];
}

export function equationOf(q: Question): string {
    const left = q.left ?? '?';
    const right = q.right ?? '?';
    const result = q.result ?? q.answer;
    return q.right === null || q.left === null ? `${left} ${q.operator} ${right} = ${result}` : `${left} ${q.operator} ${right} = ${q.answer}`;
}

export function summariseDiagnostic(answers: DiagnosticAnswer[]): DiagnosticSummary {
    const slowFacts: SlowFact[] = [];
    const groups: GroupSummary[] = GROUPS.map((group) => {
        const mine = answers.filter((a) => a.question.group === group);
        const wrong = mine.filter((a) => !a.correct).length;
        const slowOnes = mine.filter((a) => a.correct && a.retrievalMs > (tableFastMs(a.question.factKey ?? '') ?? Infinity));
        for (const a of slowOnes) {
            slowFacts.push({ factKey: a.question.factKey ?? '', equation: equationOf(a.question), seconds: Math.round(a.retrievalMs / 100) / 10 });
        }
        const status: GroupStatus = wrong > 0 ? 'practice' : slowOnes.length > 0 ? 'slow' : 'strong';
        return { group, status, wrong, slow: slowOnes.length };
    });
    const bad = groups.filter((g) => g.status === 'practice').sort((x, y) => y.wrong - x.wrong || x.group - y.group);
    const slow = groups.filter((g) => g.status === 'slow').sort((x, y) => y.slow - x.slow || x.group - y.group);
    const focus = (bad.length > 0 ? bad : slow).slice(0, 3).map((g) => g.group);
    return { groups, focus, slowFacts };
}
