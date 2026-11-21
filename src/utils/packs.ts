import { cards, type Card } from '../data/cards';
import type { UserMode } from '../data/skills';
import type { Rng } from './mathEngine';

export const PACK_PRICE: Record<UserMode, number> = { kinder: 60, grade4: 150 };
export const PITY_LIMIT = 10;
export const RARITY_WEIGHTS: Record<Card['rarity'], number> = { 1: 60, 2: 28, 3: 9, 4: 3 };
export const DUPLICATE_REFUND: Record<Card['rarity'], number> = { 1: 15, 2: 30, 3: 60, 4: 120 };

const UNOWNED_PREFERENCE = 0.7;
const RARITIES: Card['rarity'][] = [1, 2, 3, 4];

function pickRarity(rng: Rng, minRarity: Card['rarity']): Card['rarity'] {
    const eligible = RARITIES.filter((r) => r >= minRarity);
    const total = eligible.reduce((sum, r) => sum + RARITY_WEIGHTS[r], 0);
    let roll = rng() * total;
    for (const r of eligible) {
        roll -= RARITY_WEIGHTS[r];
        if (roll < 0) return r;
    }
    return eligible[eligible.length - 1];
}

export function drawCard(
    rng: Rng,
    pity: number,
    owned: Record<string, number>,
): { card: Card; isNew: boolean; nextPity: number } {
    const rarity = pickRarity(rng, pity + 1 >= PITY_LIMIT ? 3 : 1);
    const pool = cards.filter((c) => c.rarity === rarity);
    const unowned = pool.filter((c) => (owned[c.id] ?? 0) < 1);
    const useUnowned = unowned.length > 0 && rng() < UNOWNED_PREFERENCE;
    const source = useUnowned ? unowned : pool;
    const card = source[Math.floor(rng() * source.length)];
    return { card, isNew: (owned[card.id] ?? 0) < 1, nextPity: rarity >= 3 ? 0 : pity + 1 };
}
