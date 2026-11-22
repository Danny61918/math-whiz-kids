import type { Question } from './mathEngine';

/** The finished equation of a question, e.g. `7 x 8 = 56` (missing slots filled with the answer). */
export function fullEquation(q: Question): string {
    const left = q.left ?? q.answer;
    const right = q.right ?? q.answer;
    const result = q.result ?? q.answer;
    const hasResult = q.result !== null || q.right === null || q.left === null;
    return `${left} ${q.operator} ${right} = ${hasResult ? result : q.answer}`;
}
