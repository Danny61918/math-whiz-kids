import React from 'react';

/**
 * Shared building blocks of the practice screens (GamePlay and Blitz).
 * Sizes use clamp()/dvh so that question, answer, keypad and OK stay inside one viewport.
 * On wide landscape screens the shell switches to two columns (question left, keypad right).
 */

interface ShellProps {
    /** Tailwind gradient stops, e.g. "from-sky-300 via-sky-100 to-green-400". */
    background: string;
    top: React.ReactNode;
    /** Question, aid, answer box and feedback. */
    upper: React.ReactNode;
    /** Keypad and OK button. */
    lower: React.ReactNode;
}

export const PracticeShell: React.FC<ShellProps> = ({ background, top, upper, lower }) => (
    <div className={`flex min-h-dvh flex-col overflow-x-hidden bg-gradient-to-b px-3 py-2 font-sans transition-colors duration-500 ${background}`}>
        <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col gap-[clamp(4px,1dvh,10px)] min-[900px]:landscape:grid min-[900px]:landscape:max-w-[980px] min-[900px]:landscape:grid-cols-2 min-[900px]:landscape:grid-rows-[auto_1fr] min-[900px]:landscape:gap-x-10 [@media(orientation:landscape)_and_(max-height:520px)]:grid [@media(orientation:landscape)_and_(max-height:520px)]:max-w-[980px] [@media(orientation:landscape)_and_(max-height:520px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:520px)]:grid-rows-[auto_1fr] [@media(orientation:landscape)_and_(max-height:520px)]:gap-x-8">
            <div className="shrink-0 min-[900px]:landscape:col-span-2 [@media(orientation:landscape)_and_(max-height:520px)]:col-span-2">{top}</div>
            <div className="flex min-h-fit flex-1 flex-col items-center justify-center gap-[clamp(4px,1dvh,10px)] [&>*]:shrink-0">{upper}</div>
            <div className="flex shrink-0 flex-col justify-center gap-[clamp(4px,1dvh,10px)] [&>*]:shrink-0">{lower}</div>
        </div>
    </div>
);

interface TopRowProps {
    onBack: () => void;
    backLabel: string;
    /** Visible text of the back button (grade 4); kinder shows the house icon. */
    backText?: string;
    children: React.ReactNode;
}

/** Back/home button on the left, status chips on the right. */
export const PracticeTopRow: React.FC<TopRowProps> = ({ onBack, backLabel, backText, children }) => (
    <div className="flex items-center justify-between gap-2">
        <button
            onClick={onBack}
            aria-label={backLabel}
            className="flex h-[clamp(48px,7dvh,56px)] min-w-14 items-center justify-center rounded-2xl border-2 border-amber-900/20 bg-white px-3 text-lg font-black text-amber-950"
        >
            {backText ?? <span className="text-3xl leading-none">🏠</span>}
        </button>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
);

export const TopChip: React.FC<{ children: React.ReactNode; className?: string; role?: string; testId?: string }> = ({ children, className = '', role, testId }) => (
    <div role={role} data-testid={testId} className={`rounded-2xl border-2 border-amber-900/10 bg-white px-3 py-1.5 text-lg font-black text-amber-950 ${className}`}>
        {children}
    </div>
);

/** The equation, scaled with the viewport (and, for grade 4, with its length). Never wraps; scrolls sideways as a last resort. */
export const EquationBox: React.FC<{ text: string; isKinder: boolean; tint?: string }> = ({ text, isKinder, tint = 'bg-white' }) => {
    const size = isKinder
        ? 'text-[clamp(44px,min(9vw,8dvh),96px)]'
        : text.length <= 12
          ? 'text-[clamp(40px,min(11vw,8dvh),72px)]'
          : text.length <= 18
            ? 'text-[clamp(32px,min(8vw,7dvh),56px)]'
            : 'text-[clamp(24px,min(7vw,7dvh),72px)]';
    return (
        <div
            className={`max-w-full overflow-x-auto whitespace-nowrap rounded-3xl border-4 border-amber-900/20 px-4 py-[clamp(2px,0.8dvh,8px)] text-center font-black leading-tight text-amber-950 shadow-lg ${tint} ${size}`}
        >
            {text}
        </div>
    );
};

export const ANSWER_HEIGHT = 'h-[clamp(60px,10dvh,96px)]';
export const ANSWER_FONT = 'text-[clamp(32px,6dvh,56px)]';

/** Reserved space for combo / feedback text so the layout never jumps between states. */
export const MessageSlot: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
    <div className="flex min-h-[42px] w-full flex-col items-center justify-center text-center leading-tight" aria-live="polite">
        {children}
    </div>
);

const KEY_H = 'h-[clamp(56px,9dvh,80px)]';
const KEY_FONT = 'text-[clamp(28px,4.8dvh,40px)]';
const KEY_BASE = `${KEY_H} ${KEY_FONT} rounded-2xl font-black shadow-md transition active:translate-y-1 active:border-b-0`;

interface KeypadProps {
    onDigit: (n: number) => void;
    onBackspace: () => void;
    /** Bottom-left cell (the quotient/remainder toggle); empty when omitted. */
    extra?: React.ReactNode;
    deleteLabel: string;
}

export const Keypad: React.FC<KeypadProps> = ({ onDigit, onBackspace, extra, deleteLabel }) => {
    const digit = `${KEY_BASE} border-b-[5px] border-[#8f5a2b] bg-[#b97f4a] text-white`;
    return (
        <div className="grid w-full grid-cols-3 gap-[clamp(4px,1dvh,8px)]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button key={n} onClick={() => onDigit(n)} className={digit}>
                    {n}
                </button>
            ))}
            {extra ?? <div />}
            <button onClick={() => onDigit(0)} className={digit}>
                0
            </button>
            <button onClick={onBackspace} aria-label={deleteLabel} className={`${KEY_BASE} border-b-[5px] border-[#b9895a] bg-[#f0d9bf] text-amber-950`}>
                ⌫
            </button>
        </div>
    );
};

/** Keypad-sized secondary key (the division toggle). */
export const ToggleKey: React.FC<{ onClick: () => void; active: boolean; children: React.ReactNode }> = ({ onClick, active, children }) => (
    <button
        onClick={onClick}
        className={`${KEY_H} rounded-2xl border-b-[5px] px-1 text-lg font-black leading-tight shadow-md transition active:translate-y-1 active:border-b-0 ${
            active ? 'border-[#b9895a] bg-[#f0d9bf] text-amber-950' : 'border-[#6b4423] bg-[#8f5a2b] text-white'
        }`}
    >
        {children}
    </button>
);

export const SubmitButton: React.FC<{ onClick: () => void; disabled: boolean; label: string }> = ({ onClick, disabled, label }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="h-[clamp(56px,8dvh,72px)] w-full rounded-2xl border-b-[6px] border-green-900 bg-green-700 text-[clamp(24px,4dvh,32px)] font-black text-white transition active:translate-y-1 active:border-b-0 disabled:border-slate-400 disabled:bg-slate-300 disabled:text-slate-700"
    >
        {label}
    </button>
);
