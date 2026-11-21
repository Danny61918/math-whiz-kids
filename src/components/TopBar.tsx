import React from 'react';
import { t, type Language } from '../utils/i18n';

interface Props {
    lang: Language;
    isKinder: boolean;
    onBack: () => void;
    /** Page heading (rendered as h1). */
    title?: string;
    /** Right-aligned content, e.g. the player chip. */
    right?: React.ReactNode;
    /** aria-label of the back button; defaults to the generic "Back". */
    backLabel?: string;
}

/** Back/home button + title or player chip. Shared by map, chart and album. */
export const TopBar: React.FC<Props> = ({ lang, isKinder, onBack, title, right, backLabel }) => (
    <div className="flex items-center gap-3">
        <button
            onClick={onBack}
            aria-label={backLabel ?? t('back', lang)}
            className="flex min-h-14 min-w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-sky-200 bg-white px-3 text-lg font-black text-amber-950"
        >
            {isKinder ? <span className="text-3xl leading-none">🏠</span> : t('back', lang)}
        </button>
        {title && <h1 className="min-w-0 flex-1 truncate text-[28px] font-black leading-tight text-green-950">{title}</h1>}
        {right && <div className={`min-w-0 ${title ? '' : 'ml-auto'}`}>{right}</div>}
    </div>
);
