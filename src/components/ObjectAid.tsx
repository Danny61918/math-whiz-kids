import React from 'react';
import type { Question } from '../utils/mathEngine';

const Group: React.FC<{ emoji: string; count: number; dimmedFrom?: number }> = ({ emoji, count, dimmedFrom }) => (
    <div className="flex flex-wrap justify-center gap-1 max-w-[12rem]">
        {Array.from({ length: count }, (_, i) => (
            <span key={i} className={`text-3xl ${dimmedFrom !== undefined && i >= dimmedFrom ? 'opacity-25' : ''}`}>
                {emoji}
            </span>
        ))}
    </div>
);

/** Emoji objects that show the quantities of a kinder question (max 10 per group). */
export const ObjectAid: React.FC<{ question: Question }> = ({ question }) => {
    const left = question.left ?? 0;
    const right = question.right ?? 0;

    if (question.skillId === 'k_make10') {
        return (
            <div className="flex flex-wrap justify-center gap-1 max-w-[16rem]">
                {Array.from({ length: 10 }, (_, i) => (
                    <span key={i} className="text-3xl">
                        {i < left ? '🍎' : '⚪'}
                    </span>
                ))}
            </div>
        );
    }

    if (question.operator === '-') {
        return <Group emoji="🍎" count={left} dimmedFrom={left - right} />;
    }

    return (
        <div className="flex items-center justify-center gap-4">
            <Group emoji="🍎" count={left} />
            <span className="text-3xl font-black text-amber-900">+</span>
            <Group emoji="🍏" count={right} />
        </div>
    );
};
