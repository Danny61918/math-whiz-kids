import type { Question } from './mathEngine';

export type FrameCell = 'a' | 'b' | 'empty' | 'crossed';

/** The cells a question needs: addition = two colours, subtraction = last cells crossed, missing = outlined rest. */
export function frameCells(question: Question): FrameCell[] {
    const left = question.left ?? 0;
    const right = question.right ?? 0;
    const cells: FrameCell[] = [];
    const push = (kind: FrameCell, n: number) => {
        for (let i = 0; i < n; i++) cells.push(kind);
    };
    const kind = question.kind ?? (question.operator === '-' ? 'diff' : question.right === null ? 'missing' : 'sum');
    if (kind === 'diff') {
        push('a', Math.max(0, left - right));
        push('crossed', Math.min(left, right));
    } else if (kind === 'missing') {
        push('a', left);
        push('empty', Math.max(0, (question.result ?? left) - left));
    } else {
        push('a', left);
        push('b', right);
    }
    return cells;
}
