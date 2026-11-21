import type { Language, UserProfile } from './useGameStore';

interface MigratedState {
    users: Record<string, UserProfile>;
    currentUserId: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toLanguage(value: unknown): Language {
    return value === 'en' || value === 'zh-TW' ? value : 'zh-TW';
}

/** Pure migration of a v1 (farm era) save to the v2 shape. Never throws. */
export function migrateV1ToV2(persisted: unknown): MigratedState {
    const old = isRecord(persisted) ? persisted : {};
    const language = toLanguage(old.language);
    const users: Record<string, UserProfile> = {};

    if (isRecord(old.users)) {
        for (const [key, raw] of Object.entries(old.users)) {
            if (!isRecord(raw)) continue;
            const id = typeof raw.id === 'string' && raw.id ? raw.id : key;
            const coins = typeof raw.coins === 'number' && Number.isFinite(raw.coins) && raw.coins > 0 ? raw.coins : 0;
            users[id] = {
                id,
                name: typeof raw.name === 'string' ? raw.name : '',
                avatar: typeof raw.avatar === 'string' && raw.avatar ? raw.avatar : '🙂',
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
