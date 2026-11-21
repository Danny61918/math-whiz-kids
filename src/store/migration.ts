import type { Language, SkillStats, UserProfile } from './useGameStore';
import type { Stars } from '../utils/stars';
import { dayKey, isValidDayKey } from '../utils/streak';

type V3Keys = 'stars' | 'cards' | 'tickets' | 'pity' | 'streak' | 'dailyBonusDay' | 'totalSessions';
type UserProfileV2 = Omit<UserProfile, V3Keys>;

interface MigratedState {
    users: Record<string, UserProfileV2>;
    currentUserId: string | null;
}

interface MigratedStateV3 {
    users: Record<string, UserProfile>;
    currentUserId: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toLanguage(value: unknown): Language {
    return value === 'en' || value === 'zh-TW' ? value : 'zh-TW';
}

/** v1 stored the literal string 'default-avatar'; v2 expects an emoji. Keep emoji-like values, otherwise use a default. */
function toAvatar(value: unknown): string {
    return typeof value === 'string' && value.length > 0 && [...value].length <= 4 && [...value].every((ch) => (ch.codePointAt(0) ?? 0) > 127) ? value : '🦊';
}

/** Pure migration of a v1 (farm era) save to the v2 shape. Never throws. */
export function migrateV1ToV2(persisted: unknown): MigratedState {
    const old = isRecord(persisted) ? persisted : {};
    const language = toLanguage(old.language);
    const users: Record<string, UserProfileV2> = {};

    if (isRecord(old.users)) {
        for (const [key, raw] of Object.entries(old.users)) {
            if (!isRecord(raw)) continue;
            const id = typeof raw.id === 'string' && raw.id ? raw.id : key;
            const coins = typeof raw.coins === 'number' && Number.isFinite(raw.coins) && raw.coins > 0 ? raw.coins : 0;
            users[id] = {
                id,
                name: typeof raw.name === 'string' ? raw.name : '',
                avatar: toAvatar(raw.avatar),
                mode: 'grade4',
                language,
                coins,
                skills: {},
            };
        }
    }

    const currentUserId =
        typeof old.currentUserId === 'string' && old.currentUserId in users ? old.currentUserId : null;
    return { users, currentUserId };
}

function num(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nonNegInt(value: unknown): number {
    return Math.max(0, Math.floor(num(value)));
}

/** A real calendar date that is not in the future, else null. */
function dayOrNull(value: unknown, today: string): string | null {
    return isValidDayKey(value) && value <= today ? value : null;
}

function cleanSkills(raw: unknown): Record<string, SkillStats> {
    const out: Record<string, SkillStats> = {};
    if (!isRecord(raw)) return out;
    for (const [id, value] of Object.entries(raw)) {
        if (!isRecord(value)) continue;
        out[id] = {
            attempts: nonNegInt(value.attempts),
            correct: nonNegInt(value.correct),
            recent: Array.isArray(value.recent) ? value.recent.filter((r): r is boolean => typeof r === 'boolean').slice(-10) : [],
            avgTimeMs: Math.max(0, num(value.avgTimeMs)),
            lastPlayedAt: num(value.lastPlayedAt),
        };
    }
    return out;
}

/**
 * Pure migration of a v2 save to v3: adds stars/cards/tickets/pity/streak/dailyBonusDay/totalSessions.
 * Skills that already have attempts get 1 star so existing progress stays unlocked.
 * Repairs bad fields and never throws; running it on v3 data keeps valid values.
 */
export function migrateV2ToV3(persisted: unknown, today: string = dayKey(new Date())): MigratedStateV3 {
    const old = isRecord(persisted) ? persisted : {};
    const users: Record<string, UserProfile> = {};

    if (isRecord(old.users)) {
        for (const [key, raw] of Object.entries(old.users)) {
            if (!isRecord(raw)) continue;
            const id = typeof raw.id === 'string' && raw.id ? raw.id : key;
            const skills = cleanSkills(raw.skills);

            const stars: Record<string, Stars> = {};
            if (isRecord(raw.stars)) {
                for (const [skillId, v] of Object.entries(raw.stars)) {
                    if (v === 1 || v === 2 || v === 3) stars[skillId] = v;
                }
            }
            for (const [skillId, stats] of Object.entries(skills)) {
                if (stats.attempts > 0 && !stars[skillId]) stars[skillId] = 1;
            }

            const cards: Record<string, number> = {};
            if (isRecord(raw.cards)) {
                for (const [cardId, n] of Object.entries(raw.cards)) {
                    if (nonNegInt(n) > 0) cards[cardId] = nonNegInt(n);
                }
            }

            const streakRaw = isRecord(raw.streak) ? raw.streak : {};
            const count = nonNegInt(streakRaw.count);

            users[id] = {
                id,
                name: typeof raw.name === 'string' ? raw.name : '',
                avatar: typeof raw.avatar === 'string' && raw.avatar ? raw.avatar : '🙂',
                mode: raw.mode === 'kinder' ? 'kinder' : 'grade4',
                language: toLanguage(raw.language),
                coins: Math.max(0, num(raw.coins)),
                skills,
                stars,
                cards,
                tickets: nonNegInt(raw.tickets),
                pity: nonNegInt(raw.pity),
                streak: { count, best: Math.max(count, nonNegInt(streakRaw.best)), lastDay: dayOrNull(streakRaw.lastDay, today) },
                dailyBonusDay: dayOrNull(raw.dailyBonusDay, today),
                totalSessions: nonNegInt(raw.totalSessions),
            };
        }
    }

    const currentUserId =
        typeof old.currentUserId === 'string' && old.currentUserId in users ? old.currentUserId : null;
    return { users, currentUserId };
}
