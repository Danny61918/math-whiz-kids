import { create, type StoreApi } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storageService } from '../services/storageService';
import type { Language } from '../utils/i18n';
import type { UserMode } from '../data/skills';
import { migrateV1ToV2, migrateV2ToV3, migrateV3ToV4 } from './migration';
import { parseFactKey, type FactKey } from '../data/facts';
import { parseTableKey, tableFastMs } from '../data/tableFacts';
import { seedDiagnosticFact, updateFact, type FactStats } from '../utils/factProgress';
import { newlyMastered, pendingMilestones } from '../utils/chart';
import { evaluateBlitz } from '../utils/blitz';
import { FACT_MASTERY_BONUS } from '../utils/rewards';
import { DUPLICATE_REFUND, PACK_PRICE, drawCard } from '../utils/packs';
import { calcStars, type Stars } from '../utils/stars';
import { dayKey, isMilestone, updateStreak, type StreakState } from '../utils/streak';
import type { Rng } from '../utils/mathEngine';

export type { Language, UserMode, StreakState, FactStats };

export interface SkillStats {
    attempts: number;
    correct: number;
    recent: boolean[]; // last 10 results, newest last
    avgTimeMs: number; // exponential moving average
    lastPlayedAt: number;
}

export interface UserProfile {
    id: string;
    name: string;
    avatar: string;
    mode: UserMode;
    language: Language;
    coins: number;
    skills: Record<string, SkillStats>;
    stars: Record<string, Stars>; // best stars per skillId
    cards: Record<string, number>; // cardId -> copies owned
    tickets: number;
    pity: number; // pulls since the last rarity >= 3 card
    streak: StreakState;
    dailyBonusDay: string | null;
    totalSessions: number;
    facts: Record<FactKey, FactStats>; // per-fact progress (kinder), global across skills
    chartClaims: string[]; // claimed number-chart milestones, e.g. 'add25'
    blitzBest: number;
    blitzBestDay: string | null; // day the last blitz record was set
}

export interface SessionResult {
    skillId: string;
    correct: number; // first-try correct answers
    total: number;
    now?: Date;
    /** Facts as they were when the session started; used to count newly mastered facts. */
    factsBefore?: Record<FactKey, FactStats>;
    /** Facts whose +20 box-5 bonus is part of this session's coin award: they get marked as paid. */
    paidFacts?: FactKey[];
}

export interface FactRecordResult {
    boxBefore: number;
    boxAfter: number;
    /** One-time coins for a fact reaching box 5 (added to the session total by the caller). */
    bonusCoins: number;
}

export interface BlitzRecordResult {
    best: number;
    newRecord: boolean;
    ticket: boolean;
}

export interface SessionSummary {
    stars: 1 | 2 | 3;
    isNewBest: boolean;
    streak: StreakState;
    streakIncreased: boolean;
    dailyTicket: boolean;
    milestoneTicket: boolean;
    newMasteredFacts: number;
    chartTickets: number;
}

export interface PackResult {
    cardId: string;
    isNew: boolean;
    refund: number;
    usedTicket: boolean;
}

interface GameState {
    users: Record<string, UserProfile>;
    currentUserId: string | null;

    createUser: (name: string, avatar: string, mode: UserMode, language: Language) => void;
    switchUser: (id: string) => void;
    setUserLanguage: (language: Language) => void;
    setUserMode: (mode: UserMode) => void;
    addCoins: (amount: number) => void;
    recordAnswer: (skillId: string, correct: boolean, timeMs: number) => void;
    recordFact: (factKey: FactKey, correct: boolean, retrievalMs: number, helped: boolean, now?: Date) => FactRecordResult | null;
    /** Times-table check: seeds the fact (never above box 2); no coins, stars or box-5 bonus. */
    recordDiagnosticFact: (factKey: FactKey, correct: boolean, retrievalMs: number, now?: Date) => boolean;
    claimChartMilestones: () => number;
    recordBlitz: (score: number, now?: Date) => BlitzRecordResult | null;
    completeSession: (result: SessionResult) => SessionSummary | null;
    openPack: (rng?: Rng) => PackResult | false;
}

type PersistedState = Pick<GameState, 'users' | 'currentUserId'>;

const EMPTY_PROGRESS = {
    skills: {},
    stars: {},
    cards: {},
    tickets: 0,
    pity: 0,
    streak: { count: 0, best: 0, lastDay: null },
    dailyBonusDay: null,
    totalSessions: 0,
    facts: {},
    chartClaims: [],
    blitzBest: 0,
    blitzBestDay: null,
} satisfies Pick<
    UserProfile,
    'skills' | 'stars' | 'cards' | 'tickets' | 'pity' | 'streak' | 'dailyBonusDay' | 'totalSessions' | 'facts' | 'chartClaims' | 'blitzBest' | 'blitzBestDay'
>;

const RECENT_LIMIT = 10;
const EMA_ALPHA = 0.2;

function updateCurrentUser(
    set: StoreApi<GameState>['setState'],
    fn: (user: UserProfile) => UserProfile,
): void {
    set((state) => {
        const userId = state.currentUserId;
        if (!userId || !state.users[userId]) return state;
        return { users: { ...state.users, [userId]: fn(state.users[userId]) } };
    });
}

// Custom storage adapter to use our StorageService
const storageAdapter = {
    getItem: (name: string) => {
        const item = storageService.getItem(name);
        return item ? JSON.stringify(item) : null;
    },
    setItem: (name: string, value: string) => {
        storageService.setItem(name, JSON.parse(value));
    },
    removeItem: (name: string) => {
        storageService.removeItem(name);
    },
};

export const useGameStore = create<GameState>()(
    persist(
        (set) => ({
            users: {},
            currentUserId: null,

            createUser: (name, avatar, mode, language) => {
                const id = crypto.randomUUID();
                const newUser: UserProfile = { id, name, avatar, mode, language, coins: 0, ...EMPTY_PROGRESS };
                set((state) => ({
                    users: { ...state.users, [id]: newUser },
                    currentUserId: id,
                }));
            },

            switchUser: (id) => {
                set((state) => (state.users[id] ? { currentUserId: id } : state));
            },

            setUserLanguage: (language) => {
                updateCurrentUser(set, (user) => ({ ...user, language }));
            },

            setUserMode: (mode) => {
                updateCurrentUser(set, (user) => ({ ...user, mode }));
            },

            addCoins: (amount) => {
                updateCurrentUser(set, (user) => ({ ...user, coins: user.coins + amount }));
            },

            recordAnswer: (skillId, correct, timeMs) => {
                updateCurrentUser(set, (user) => {
                    const prev = user.skills[skillId];
                    const stats: SkillStats = {
                        attempts: (prev?.attempts ?? 0) + 1,
                        correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
                        recent: [...(prev?.recent ?? []), correct].slice(-RECENT_LIMIT),
                        avgTimeMs: prev ? prev.avgTimeMs * (1 - EMA_ALPHA) + timeMs * EMA_ALPHA : timeMs,
                        lastPlayedAt: Date.now(),
                    };
                    return { ...user, skills: { ...user.skills, [skillId]: stats } };
                });
            },

            recordFact: (factKey, correct, retrievalMs, helped, now = new Date()) => {
                if (!parseFactKey(factKey) && !parseTableKey(factKey)) return null;
                let outcome: FactRecordResult | null = null;
                updateCurrentUser(set, (user) => {
                    const prev = user.facts[factKey];
                    const next = updateFact(prev, { correct, retrievalMs, helped }, dayKey(now), tableFastMs(factKey));
                    // paid5 is set by completeSession once the coins were really awarded.
                    const reachedTop = next.box === 5 && (prev?.box ?? 0) < 5 && !prev?.paid5;
                    outcome = { boxBefore: prev?.box ?? 0, boxAfter: next.box, bonusCoins: reachedTop ? FACT_MASTERY_BONUS : 0 };
                    return { ...user, facts: { ...user.facts, [factKey]: next } };
                });
                return outcome;
            },

            recordDiagnosticFact: (factKey, correct, retrievalMs, now = new Date()) => {
                if (!parseTableKey(factKey)) return false;
                updateCurrentUser(set, (user) => ({
                    ...user,
                    facts: { ...user.facts, [factKey]: seedDiagnosticFact(user.facts[factKey], { correct, retrievalMs }, dayKey(now), tableFastMs(factKey)) },
                }));
                return true;
            },

            claimChartMilestones: () => {
                let granted = 0;
                updateCurrentUser(set, (user) => {
                    const pending = pendingMilestones(user.facts, user.chartClaims);
                    if (pending.length === 0) return user;
                    granted = pending.reduce((sum, m) => sum + m.tickets, 0);
                    return {
                        ...user,
                        tickets: user.tickets + granted,
                        chartClaims: [...user.chartClaims, ...pending.map((m) => m.id)],
                    };
                });
                return granted;
            },

            recordBlitz: (score, now = new Date()) => {
                let outcome: BlitzRecordResult | null = null;
                updateCurrentUser(set, (user) => {
                    const r = evaluateBlitz(score, user.blitzBest, user.blitzBestDay, dayKey(now));
                    outcome = { best: r.best, newRecord: r.newRecord, ticket: r.ticket };
                    if (!r.newRecord) return user;
                    return { ...user, blitzBest: r.best, blitzBestDay: r.bestDay, tickets: user.tickets + (r.ticket ? 1 : 0) };
                });
                return outcome;
            },

            completeSession: (result) => {
                let summary: SessionSummary | null = null;
                updateCurrentUser(set, (user) => {
                    const today = dayKey(result.now ?? new Date());
                    const earned = calcStars(result.correct, result.total);
                    const previousBest = user.stars[result.skillId] ?? 0;
                    const streak = updateStreak(user.streak, today);
                    const streakIncreased = user.streak.lastDay === null || today > user.streak.lastDay;
                    const dailyTicket = user.dailyBonusDay !== today;
                    const milestoneTicket = streakIncreased && isMilestone(streak.count);
                    const newMasteredFacts = result.factsBefore ? newlyMastered(result.factsBefore, user.facts) : 0;
                    const pending = pendingMilestones(user.facts, user.chartClaims);
                    const chartTickets = pending.reduce((sum, m) => sum + m.tickets, 0);
                    const paid = result.paidFacts ?? [];
                    const facts = paid.some((k) => user.facts[k])
                        ? { ...user.facts, ...Object.fromEntries(paid.filter((k) => user.facts[k]).map((k) => [k, { ...user.facts[k], paid5: true }])) }
                        : user.facts;
                    summary = {
                        stars: earned,
                        isNewBest: earned > previousBest,
                        streak,
                        streakIncreased,
                        dailyTicket,
                        milestoneTicket,
                        newMasteredFacts,
                        chartTickets,
                    };
                    return {
                        ...user,
                        stars: { ...user.stars, [result.skillId]: Math.max(previousBest, earned) as Stars },
                        streak,
                        dailyBonusDay: dailyTicket ? today : user.dailyBonusDay,
                        tickets: user.tickets + (dailyTicket ? 1 : 0) + (milestoneTicket ? 1 : 0) + chartTickets,
                        chartClaims: pending.length > 0 ? [...user.chartClaims, ...pending.map((m) => m.id)] : user.chartClaims,
                        totalSessions: user.totalSessions + 1,
                        facts,
                    };
                });
                return summary;
            },

            openPack: (rng = Math.random) => {
                let result: PackResult | false = false;
                updateCurrentUser(set, (user) => {
                    const usedTicket = user.tickets > 0;
                    const price = PACK_PRICE[user.mode];
                    if (!usedTicket && user.coins < price) return user;
                    const draw = drawCard(rng, user.pity, user.cards);
                    const refund = draw.isNew ? 0 : DUPLICATE_REFUND[draw.card.rarity];
                    result = { cardId: draw.card.id, isNew: draw.isNew, refund, usedTicket };
                    return {
                        ...user,
                        tickets: usedTicket ? user.tickets - 1 : user.tickets,
                        coins: user.coins - (usedTicket ? 0 : price) + refund,
                        cards: { ...user.cards, [draw.card.id]: (user.cards[draw.card.id] ?? 0) + 1 },
                        pity: draw.nextPity,
                    };
                });
                return result;
            },
        }),
        {
            name: 'math-whiz-kids-storage',
            version: 4,
            storage: createJSONStorage(() => storageAdapter),
            migrate: (persisted, version) => {
                let state: unknown = persisted;
                if (version < 2) state = migrateV1ToV2(state);
                if (version < 3) state = migrateV2ToV3(state);
                if (version < 4) state = migrateV3ToV4(state);
                return state as PersistedState;
            },
        },
    ),
);

export function useCurrentUser(): UserProfile | null {
    return useGameStore((state) => (state.currentUserId ? (state.users[state.currentUserId] ?? null) : null));
}

export function useLanguage(): Language {
    return useGameStore((state) =>
        state.currentUserId ? (state.users[state.currentUserId]?.language ?? 'zh-TW') : 'zh-TW',
    );
}
