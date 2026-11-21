import type { FactKey } from '../data/facts';
import { allFacts } from '../data/facts';
import { factLevel, type FactStats } from './factProgress';

export type ChartId = 'add' | 'sub';

export const CHART_SIZE = 81;
export const CHART_MILESTONES = [
    { pct: 25, tickets: 1 },
    { pct: 50, tickets: 1 },
    { pct: 75, tickets: 2 },
    { pct: 100, tickets: 3 },
] as const;

export interface PendingMilestone {
    id: string; // e.g. 'add50'
    chart: ChartId;
    pct: number;
    tickets: number;
}

export const claimId = (chart: ChartId, pct: number): string => `${chart}${pct}`;
export const milestoneThreshold = (pct: number): number => Math.ceil((CHART_SIZE * pct) / 100);

export function chartMasteredCount(facts: Record<FactKey, FactStats>, chart: ChartId): number {
    const op = chart === 'add' ? '+' : '-';
    return allFacts.filter((f) => f.op === op && factLevel(facts[f.key]) === 'mastered').length;
}

/** Number of mastered facts overall (both charts). */
export function masteredTotal(facts: Record<FactKey, FactStats>): number {
    return chartMasteredCount(facts, 'add') + chartMasteredCount(facts, 'sub');
}

/** Milestones reached but not yet claimed, in chart/percent order. */
export function pendingMilestones(facts: Record<FactKey, FactStats>, claims: string[]): PendingMilestone[] {
    const out: PendingMilestone[] = [];
    for (const chart of ['add', 'sub'] as const) {
        const count = chartMasteredCount(facts, chart);
        for (const m of CHART_MILESTONES) {
            const id = claimId(chart, m.pct);
            if (count >= milestoneThreshold(m.pct) && !claims.includes(id)) out.push({ id, chart, pct: m.pct, tickets: m.tickets });
        }
    }
    return out;
}

/** Facts that are mastered in `after` but were not in `before`. */
export function newlyMastered(before: Record<FactKey, FactStats>, after: Record<FactKey, FactStats>): number {
    return Object.keys(after).filter((k) => factLevel(after[k]) === 'mastered' && factLevel(before[k]) !== 'mastered').length;
}
