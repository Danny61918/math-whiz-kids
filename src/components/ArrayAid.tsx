import React, { useEffect, useState } from 'react';
import { parseTableKey } from '../data/tableFacts';
import { BLOCK_GAP, arrayLayout, units, BLOCK } from '../utils/arrayLayout';
import type { Question } from '../utils/mathEngine';
import { tp, type Language } from '../utils/i18n';

function useViewport(): { w: number; h: number } {
    const read = () => ({ w: window.innerWidth, h: window.innerHeight });
    const [size, setSize] = useState(read);
    useEffect(() => {
        const onResize = () => setSize(read());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    return size;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Array / dot-grid aid of a times-table fact (grade 4): `rows` x `cols` dots, grouped every 5.
 * x: the factors; /: the dividend laid out as a grid. Decorative with a text alternative; for the
 * large facts whose dots would get too small it falls back to "N groups of M" chips.
 */
export const ArrayAid: React.FC<{ question: Question; lang: Language }> = ({ question, lang }) => {
    const { w, h } = useViewport();
    const fact = question.factKey ? parseTableKey(question.factKey) : null;
    if (!fact) return null;
    const availH = clamp(h * 0.2, 70, 170);
    const availW = Math.min(w - 48, 320);
    const layout = arrayLayout(fact.a, fact.b, availW, availH);
    const { rows, cols } = layout;
    const alt =
        fact.op === '×'
            ? tp('arrayAltMul', lang, { a: rows, b: cols, p: fact.product })
            : tp('arrayAltDiv', lang, { p: fact.product, d: fact.a, q: fact.b });

    if (layout.compact) {
        return (
            <div data-testid="array-aid" data-mode="groups" className="flex max-w-full flex-col items-center gap-1 rounded-xl border-[3px] border-amber-700 bg-amber-50 px-3 py-1.5">
                <span className="sr-only">{alt}</span>
                <span aria-hidden="true" className="text-base font-black leading-tight text-amber-950">
                    {tp('arrayGroups', lang, { a: rows, b: cols })}
                </span>
                <div aria-hidden="true" className="flex flex-wrap items-center justify-center gap-1">
                    {Array.from({ length: rows }, (_, i) => (
                        <span key={i} className="flex min-h-7 min-w-7 items-center justify-center rounded-lg border-2 border-amber-600 bg-amber-300 px-1.5 text-base font-black leading-none text-amber-950">
                            {cols}
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    const width = units(cols) * layout.pitch;
    const height = units(rows) * layout.pitch;
    const gapAt = (i: number) => BLOCK_GAP * Math.floor(i / BLOCK);
    return (
        <div data-testid="array-aid" data-mode="dots" className="rounded-xl border-[3px] border-amber-700 bg-amber-50 p-1.5">
            <span className="sr-only">{alt}</span>
            <svg aria-hidden="true" focusable="false" width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
                {Array.from({ length: rows }, (_, r) =>
                    Array.from({ length: cols }, (_, c) => (
                        <circle
                            key={`${r}-${c}`}
                            cx={(c + gapAt(c)) * layout.pitch + layout.pitch / 2}
                            cy={(r + gapAt(r)) * layout.pitch + layout.pitch / 2}
                            r={layout.dot / 2}
                            className={r % 2 === 0 ? 'fill-amber-500 stroke-amber-700' : 'fill-sky-500 stroke-sky-700'}
                            strokeWidth={1.5}
                        />
                    )),
                )}
            </svg>
        </div>
    );
};
