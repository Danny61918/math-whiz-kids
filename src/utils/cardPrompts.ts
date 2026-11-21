import type { Card } from '../data/cards.ts';

export interface PromptRow {
    id: string;
    category: string;
    rarity: number;
    nameEn: string;
    nameZh: string;
    output_filename: string;
    prompt: string;
    negative_prompt: string;
}

export function subjectFor(card: Pick<Card, 'category' | 'nameEn'>): string {
    switch (card.category) {
        case 'dino':
            return `a friendly cartoon ${card.nameEn} dinosaur`;
        case 'space':
            return `a cute cartoon ${card.nameEn}, outer space theme`;
        case 'rescue':
            return `a cute cartoon ${card.nameEn}, rescue and emergency helper theme`;
        default:
            return `a cute cartoon ${card.nameEn}`;
    }
}

export function flourishFor(rarity: Card['rarity']): string {
    if (rarity === 4) return ', golden sparkles and a magical glow';
    if (rarity === 3) return ', a few sparkles';
    return '';
}

/** Pure: one card -> one row of the prompt export. */
export function buildPromptRow(card: Card, style: string, negative: string): PromptRow {
    return {
        id: card.id,
        category: card.category,
        rarity: card.rarity,
        nameEn: card.nameEn,
        nameZh: card.nameZh,
        output_filename: `${card.id}.webp`,
        prompt: `${style}, ${subjectFor(card)}${flourishFor(card.rarity)}`,
        negative_prompt: negative,
    };
}

function csvCell(value: string | number): string {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: PromptRow[]): string {
    const columns: (keyof PromptRow)[] = ['id', 'category', 'rarity', 'nameEn', 'nameZh', 'output_filename', 'prompt', 'negative_prompt'];
    const lines = rows.map((r) => columns.map((c) => csvCell(r[c])).join(','));
    return `${[columns.join(','), ...lines].join('\n')}\n`;
}
