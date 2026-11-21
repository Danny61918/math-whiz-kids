import React from 'react';

const STAR_PATH = 'M12 2.5l2.94 6.1 6.66.9-4.85 4.7 1.2 6.6L12 17.6l-5.95 3.2 1.2-6.6L2.4 9.5l6.66-.9z';

interface Props {
    value: number;
    max?: number;
    /** Pixel size of each star. */
    size?: number;
    className?: string;
}

/** Filled gold stars versus outlined grey stars (shape and fill differ, so colour is not the only cue). */
export const StarRating: React.FC<Props> = ({ value, max = 3, size = 28, className = '' }) => (
    <span role="img" aria-label={`${value} / ${max}`} className={`inline-flex items-center gap-0.5 ${className}`}>
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
