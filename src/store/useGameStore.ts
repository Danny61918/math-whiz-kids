import { create, type StoreApi } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storageService } from '../services/storageService';
import type { Language } from '../utils/i18n';
import type { UserMode } from '../data/skills';
import { migrateV1ToV2 } from './migration';

export { migrateV1ToV2 };

export type { Language, UserMode };

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
}

interface GameState {
    users: Record<string, UserProfile>;
    currentUserId: string | null;

    createUser: (name: string, avatar: string, mode: UserMode, language: Language) => void;
    switchUser: (id: string) => void;
    setUserLanguage: (language: Language) => void;
    addCoins: (amount: number) => void;
    recordAnswer: (skillId: string, correct: boolean, timeMs: number) => void;
}

type PersistedState = Pick<GameState, 'users' | 'currentUserId'>;

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
                const newUser: UserProfile = { id, name, avatar, mode, language, coins: 0, skills: {} };
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
        }),
        {
            name: 'math-whiz-kids-storage',
            version: 2,
            storage: createJSONStorage(() => storageAdapter),
            migrate: (persisted, version) => (version < 2 ? migrateV1ToV2(persisted) : (persisted as PersistedState)),
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
