import React from 'react';
import type { Question } from '../utils/mathEngine';
import { frameCells, type FrameCell } from '../utils/frame';
import { tp, type Language } from '../utils/i18n';

const FRAME_SIZE = 10;

function altText(question: Question, lang: Language): string {
    const left = question.left ?? 0;
    if (question.kind === 'diff') return tp('frameAltDiff', lang, { m: left, s: question.right ?? 0 });
    if (question.kind === 'missing') return tp('frameAltMissing', lang, { a: left, rest: question.answer, c: question.result ?? 0 });
    return tp('frameAltSum', lang, { a: left, b: question.right ?? 0 });
}

const CELL_CLASS: Record<FrameCell, string> = {
    a: 'bg-amber-500 border-amber-600',
    b: 'bg-sky-500 border-sky-700',
    empty: 'bg-white/70 border-dashed border-amber-700/60',
    crossed: 'bg-neutral-200 border-neutral-300 text-neutral-500 opacity-70',
};

/** Ten-frame(s) showing the quantities of a kinder fact question. Decorative: a text alternative is provided. */
export const TenFrame: React.FC<{ question: Question; lang: Language }> = ({ question, lang }) => {
    const cells = frameCells(question);
    const frames = Array.from({ length: Math.max(1, Math.ceil(cells.length / FRAME_SIZE)) }, (_, i) =>
        cells.slice(i * FRAME_SIZE, (i + 1) * FRAME_SIZE),
    );
    return (
        <div data-testid="ten-frame">
            <span className="sr-only">{altText(question, lang)}</span>
            <div aria-hidden="true" className="flex flex-wrap items-center justify-center gap-3">
                {frames.map((frame, f) => (
                    <div key={f} className="grid grid-cols-5 gap-1 rounded-xl border-4 border-amber-700 bg-amber-50 p-1">
                        {Array.from({ length: FRAME_SIZE }, (_, i) => {
                            const cell = frame[i];
                            return (
                                <div
                                    key={i}
                                    className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-black ${
                                        cell ? CELL_CLASS[cell] : 'border-amber-200 bg-transparent'
                                    }`}
                                >
                                    {cell === 'crossed' ? '✕' : ''}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};
