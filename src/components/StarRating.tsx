import React from 'react';

import { STAR_PATH } from '../utils/starPath';

interface Props {
    value: number;
    max?: number;
    /** Pixel size of each star. */
    size?: number;
    className?: string;
    /** Spoken label; defaults to "n / max". */
    label?: string;
}

/** Filled gold stars versus outlined grey stars (shape and fill differ, so colour is not the only cue). */
export const StarRating: React.FC<Props> = ({ value, max = 3, size = 28, className = '', label }) => (
    <span role="img" aria-label={label ?? `${value} / ${max}`} className={`inline-flex items-center gap-0.5 ${className}`}>
        {Array.from({ length: max }, (_, i) => {
            const on = i < value;
            return (
                <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                        d={STAR_PATH}
                        fill={on ? '#F5B301' : '#FFFFFF'}
                        stroke={on ? '#B77900' : '#7C8896'}
                        strokeWidth={on ? 1.4 : 1.8}
                        strokeLinejoin="round"
                    />
                </svg>
            );
        })}
    </span>
);
