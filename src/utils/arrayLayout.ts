/** Smallest dot diameter (px) the full dot array may use; below it the compact "groups of" visual is shown. */
const MIN_DOT = 12;
export const DOT_RATIO = 0.88; // dot diameter / pitch
export const BLOCK = 5; // a small extra gap every 5 rows / columns
export const BLOCK_GAP = 0.5; // in dot pitches

export interface ArrayLayout {
    rows: number;
    cols: number;
    pitch: number;
    dot: number;
    compact: boolean;
}

/**
 * Rows/columns of the array. x: the smaller factor gives the rows (fewer rows keeps it short).
 * / : rows = divisor `a`, columns = quotient `b` (the dividend shared into d equal rows).
 */
export function arrayShape(op: '×' | '÷', a: number, b: number): { rows: number; cols: number } {
    return op === '÷' ? { rows: a, cols: b } : { rows: Math.min(a, b), cols: Math.max(a, b) };
}

export const units = (n: number) => n + BLOCK_GAP * Math.floor((n - 1) / BLOCK);

/**
 * Sizes the array into the room available. When the dots would be smaller than MIN_DOT px the layout
 * is flagged `compact` (a row of "N groups of M" chips is drawn instead, so 9 x 9 stays legible).
 */
export function arrayLayout(op: '×' | '÷', a: number, b: number, availWidth: number, availHeight: number): ArrayLayout {
    const { rows, cols } = arrayShape(op, a, b);
    const pitch = Math.min(availHeight / units(rows), availWidth / units(cols), 30);
    const dot = pitch * DOT_RATIO;
    return { rows, cols, pitch, dot, compact: dot < MIN_DOT };
}

