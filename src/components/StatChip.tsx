import React from 'react';

interface Props {
    icon: string;
    value: string | number;
    /** Spoken/tooltip name of the stat, e.g. "Coins". */
    label: string;
    onClick?: () => void;
    highlight?: boolean;
    /** Kinder mode: 72px tall tap target. */
    tall?: boolean;
}

const base = 'flex min-h-12 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-2xl bg-white px-2 py-2 text-lg font-black text-amber-950';

/** A white stat chip with a visible icon + number. Becomes a button when onClick is given. */
export const StatChip: React.FC<Props> = ({ icon, value, label, onClick, highlight = false, tall = false }) => {
    const border = highlight ? 'border-2 border-yellow-400' : 'border-2 border-transparent';
    const content = (
        <>
            <span aria-hidden="true">{icon}</span>
            <span>{value}</span>
        </>
    );
    if (onClick) {
        return (
            <button onClick={onClick} aria-label={`${label}: ${value}`} title={label} className={`${base} ${tall ? 'min-h-[72px]' : ''} ${border} transition active:translate-y-0.5`}>
                {content}
            </button>
        );
    }
    return (
        <span role="group" aria-label={`${label}: ${value}`} title={label} className={`${base} ${border}`}>
            {content}
        </span>
    );
};
