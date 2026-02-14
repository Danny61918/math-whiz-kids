import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storageService } from '../services/storageService';

export interface PlacedItem {
    id: string; // Unique ID for the placed instance
    itemId: string; // ID from shopItems
    x: number;
    y: number;
    experience?: number; // Growth experience (0-100+)
}

export interface UserProfile {
    id: string;
    name: string;
    avatar: string;
    coins: number;
    inventory: Record<string, number>; // ItemID -> Quantity
    placedItems: PlacedItem[];
    landLevel?: number; // Default 1
}

export interface GameSettings {
    operations: ('+' | '-' | '*' | '/')[];
    leftDigits: number;
    rightDigits: number;
    questionCount: number;
}

interface GameState {
    users: Record<string, UserProfile>;
    currentUserId: string | null;
    settings: GameSettings;
    language: 'zh-TW' | 'en';

    // Actions
    createUser: (name: string, avatar: string) => void;
    switchUser: (userId: string) => void;
    updateSettings: (settings: Partial<GameSettings>) => void;
    addCoins: (amount: number) => void;
    setLanguage: (lang: 'zh-TW' | 'en') => void;
    buyItem: (itemId: string, cost: number) => boolean;
    placeItem: (itemId: string, x?: number, y?: number) => void;
    moveItem: (placedId: string, x: number, y: number) => void;
    removeItem: (placedId: string) => void;
    growPlants: (amount: number) => void;
    harvestPlot: (placedId: string) => boolean;
    removeAllPlacedItems: () => void;
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
        (set, get) => ({
            users: {},
            currentUserId: null,
            language: 'zh-TW',
            settings: {
                operations: ['+'],
                leftDigits: 1,
                rightDigits: 1,
                questionCount: 10,
            },

            setLanguage: (lang) => set({ language: lang }),

            createUser: (name, avatar) => {
                const id = crypto.randomUUID();
                const newUser: UserProfile = {
                    id,
                    name,
                    avatar,
                    coins: 0,
                    inventory: {},
                    placedItems: []
                };
                set((state) => ({
                    users: { ...state.users, [id]: newUser },
                    currentUserId: id, // Auto-switch to new user
                }));
            },

            switchUser: (userId) => {
                set({ currentUserId: userId });
            },

            updateSettings: (newSettings) => {
                set((state) => ({
                    settings: { ...state.settings, ...newSettings },
                }));
            },

            addCoins: (amount) => {
                set((state) => {
                    const userId = state.currentUserId;
                    if (!userId) return state;
                    const user = state.users[userId];
                    return {
                        users: {
                            ...state.users,
                            [userId]: { ...user, coins: user.coins + amount },
                        },
                    };
                });
            },

            buyItem: (itemId, cost) => {
                const state = get();
                const userId = state.currentUserId;
                if (!userId) return false;
                const user = state.users[userId];
                // Migration support: ensure inventory is Record
                const inventory = Array.isArray(user.inventory) ? {} : (user.inventory || {});

                if (user.coins >= cost) {
                    // Special case: Land Expansion
                    if (itemId === 'land_expansion') {
                        set({
                            users: {
                                ...state.users,
                                [userId]: {
                                    ...user,
                                    coins: user.coins - cost,
                                    landLevel: (user.landLevel || 1) + 1
                                }
                            }
                        });
                        return true;
                    }

                    const currentCount = inventory[itemId] || 0;
                    set({
                        users: {
                            ...state.users,
                            [userId]: {
                                ...user,
                                coins: user.coins - cost,
                                inventory: {
                                    ...inventory,
                                    [itemId]: currentCount + 1
                                },
                            },
                        },
                    });
                    return true;
                }
                return false;
            },

            harvestPlot: (placedId) => {
                const state = get();
                const userId = state.currentUserId;
                if (!userId) return false;
                const user = state.users[userId];
                const placedItems = user.placedItems || [];
                const plot = placedItems.find(i => i.id === placedId);

                // Check if it's a plot and ready (XP >= 100)
                if (plot && plot.itemId === 'farm_plot' && (plot.experience || 0) >= 100) {
                    set({
                        users: {
                            ...state.users,
                            [userId]: {
                                ...user,
                                coins: user.coins + 500, // Harvest Reward
                                placedItems: placedItems.map(item =>
                                    item.id === placedId ? { ...item, experience: 0 } : item
                                )
                            }
                        }
                    });
                    return true;
                }
                return false;
            },

            placeItem: (itemId, x = 100, y = 100) => {
                const state = get();
                const userId = state.currentUserId;
                if (!userId) return;
                const user = state.users[userId];
                const inventory = Array.isArray(user.inventory) ? {} : (user.inventory || {});

                if ((inventory[itemId] || 0) > 0) {
                    const placedId = crypto.randomUUID();
                    set({
                        users: {
                            ...state.users,
                            [userId]: {
                                ...user,
                                inventory: {
                                    ...inventory,
                                    [itemId]: inventory[itemId] - 1
                                },
                                placedItems: [
                                    ...(user.placedItems || []),
                                    { id: placedId, itemId, x, y }
                                ]
                            }
                        }
                    });
                }
            },

            moveItem: (placedId, x, y) => {
                set((state) => {
                    const userId = state.currentUserId;
                    if (!userId) return state;
                    const user = state.users[userId];
                    const placedItems = user.placedItems || [];

                    return {
                        users: {
                            ...state.users,
                            [userId]: {
                                ...user,
                                placedItems: placedItems.map(item =>
                                    item.id === placedId ? { ...item, x, y } : item
                                )
                            }
                        }
                    };
                });
            },

            growPlants: (amount) => {
                set((state) => {
                    const userId = state.currentUserId;
                    if (!userId) return state;
                    const user = state.users[userId];

                    const placedItems = (user.placedItems || []).map(item => ({
                        ...item,
                        experience: (item.experience || 0) + amount
                    }));

                    return {
                        users: {
                            ...state.users,
                            [userId]: {
                                ...user,
                                placedItems
                            }
                        }
                    };
                });
            },

            removeItem: (placedId) => {
                const state = get();
                const userId = state.currentUserId;
                if (!userId) return;
                const user = state.users[userId];
                const placedItems = user.placedItems || [];
                const itemToRemove = placedItems.find(i => i.id === placedId);

                if (itemToRemove) {
                    const inventory = Array.isArray(user.inventory) ? {} : (user.inventory || {});
                    set({
                        users: {
                            ...state.users,
                            [userId]: {
                                ...user,
                                placedItems: placedItems.filter(i => i.id !== placedId),
                                inventory: {
                                    ...inventory,
                                    [itemToRemove.itemId]: (inventory[itemToRemove.itemId] || 0) + 1
                                }
                            }
                        }
                    });
                }
            },

            removeAllPlacedItems: () => {
                set((state) => {
                    const userId = state.currentUserId;
                    if (!userId) return state;
                    const user = state.users[userId];
                    const placedItems = user.placedItems || [];
                    const inventory = Array.isArray(user.inventory) ? {} : (user.inventory || {});

                    // Return everything to inventory
                    const newInventory = { ...inventory };
                    placedItems.forEach(item => {
                        newInventory[item.itemId] = (newInventory[item.itemId] || 0) + 1;
                    });

                    return {
                        users: {
                            ...state.users,
                            [userId]: {
                                ...user,
                                placedItems: [],
                                inventory: newInventory
                            }
                        }
                    };
                });
            },

        }),
        {
            name: 'math-whiz-kids-storage',
            storage: createJSONStorage(() => storageAdapter),
        }
    )
);
