/** Convention: art for a card lives at public/cards/<cardId>.webp. Presence of the file is enough. */
export function cardArtUrl(cardId: string, base: string = import.meta.env.BASE_URL): string {
    const prefix = base.endsWith('/') ? base : `${base}/`;
    return `${prefix}cards/${cardId}.webp`;
}
