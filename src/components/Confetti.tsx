import React, { useMemo } from 'react';

const PIECES = ['🎉', '⭐', '✨', '🎊', '💫'];

/** Emoji confetti, pure CSS. Hidden under prefers-reduced-motion (see index.css). */
export const Confetti: React.FC<{ count?: number }> = ({ count = 24 }) => {
    const pieces = useMemo(
        () =>
            Array.from({ length: count }, (_, i) => ({
                emoji: PIECES[i % PIECES.length],
                left: (i * 97) % 100,
                delay: ((i * 53) % 20) / 10,
                size: 1 + ((i * 7) % 10) / 10,
            })),
        [count],
    );
    return (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden="true">
            {pieces.map((p, i) => (
                <span
                    key={i}
                    className="animate-confetti absolute top-0"
                    style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, fontSize: `${p.size * 1.5}rem` }}
                >
                    {p.emoji}
                </span>
            ))}
        </div>
    );
};
