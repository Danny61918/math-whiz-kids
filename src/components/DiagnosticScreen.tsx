import React, { useEffect, useRef, useState } from 'react';
import { useCurrentUser, useGameStore } from '../store/useGameStore';
import { audioService } from '../services/audioService';
import { buildDiagnosticQuestions, DIAGNOSTIC_COUNT, summariseDiagnostic, type DiagnosticAnswer, type GroupStatus } from '../utils/diagnostic';
import { t, tp, type TranslationKey } from '../utils/i18n';
import { checkAnswer } from '../utils/mathEngine';
import { recommendedGrade4SkillId } from '../utils/tracks';
import { ANSWER_FONT, ANSWER_HEIGHT, EquationBox, Keypad, PracticeShell, PracticeTopRow, SubmitButton, TopChip } from './PracticeParts';

const MAX_DIGITS = 2;

type Phase = 'intro' | 'quiz' | 'result';

const STATUS_STYLE: Record<GroupStatus, { label: TranslationKey; symbol: string; cls: string }> = {
    strong: { label: 'diagStatusStrong', symbol: '✓', cls: 'border-green-700 bg-green-100 text-green-950' },
    slow: { label: 'diagStatusSlow', symbol: '⏱', cls: 'border-amber-600 bg-yellow-100 text-amber-950' },
    practice: { label: 'diagStatusPractice', symbol: '✏️', cls: 'border-red-700 bg-orange-100 text-red-950' },
};

const cardShell = 'min-h-dvh overflow-x-hidden bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 flex flex-col items-center justify-center px-4 py-6 font-sans';
const card = 'w-full max-w-[520px] rounded-3xl border-[6px] border-[#d4a373] bg-white p-5 text-center shadow-2xl';
const bigButton = 'min-h-[64px] w-full text-2xl font-black rounded-2xl border-b-8 transition active:translate-y-1 active:border-b-4';

/** One-time, re-runnable times-table check: 27 questions, no aids, no retries, no coins or stars. */
export const DiagnosticScreen: React.FC<{ onBack: () => void; onStart: (skillId: string) => void }> = ({ onBack, onStart }) => {
    const user = useCurrentUser();
    const recordDiagnosticFact = useGameStore((s) => s.recordDiagnosticFact);
    const [questions] = useState(() => buildDiagnosticQuestions(Math.random));
    const [phase, setPhase] = useState<Phase>('intro');
    const [index, setIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [answers, setAnswers] = useState<DiagnosticAnswer[]>([]);

    const startRef = useRef(0);
    const firstDigitAtRef = useRef<number | null>(null);
    const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

    useEffect(() => {
        startRef.current = Date.now();
        firstDigitAtRef.current = null;
    }, [index, phase]);

    const current = questions[index];

    const appendDigit = (digit: number) => {
        if (phase !== 'quiz') return;
        firstDigitAtRef.current ??= Date.now();
        setAnswer((prev) => (prev + digit).slice(0, MAX_DIGITS));
    };
    const backspace = () => {
        if (phase === 'quiz') setAnswer((prev) => prev.slice(0, -1));
    };
    const submit = () => {
        if (phase !== 'quiz' || answer === '' || !current) return;
        const correct = checkAnswer(current, { answer: Number(answer) });
        const retrievalMs = (firstDigitAtRef.current ?? Date.now()) - startRef.current;
        if (current.factKey) recordDiagnosticFact(current.factKey, correct, retrievalMs);
        const next = [...answers, { question: current, correct, retrievalMs }];
        setAnswers(next);
        setAnswer('');
        if (index + 1 >= DIAGNOSTIC_COUNT) {
            audioService.playWin();
            setPhase('result');
        } else {
            setIndex(index + 1);
        }
    };

    useEffect(() => {
        keyHandlerRef.current = (e) => {
            if (e.key >= '0' && e.key <= '9') appendDigit(Number(e.key));
            else if (e.key === 'Backspace') backspace();
            else if (e.key === 'Enter') submit();
        };
    });
    useEffect(() => {
        const listener = (e: KeyboardEvent) => keyHandlerRef.current(e);
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, []);

    if (!user) return null;
    const lang = user.language;

    if (phase === 'intro') {
        return (
            <div className={cardShell}>
                <div className={card}>
                    <h1 className="mb-2 text-3xl font-black text-sky-900">{t('diagTitle', lang)}</h1>
                    <p className="mb-1 text-xl font-bold text-amber-950">{t('diagIntro', lang)}</p>
                    <p className="mb-3 text-lg font-bold text-amber-900">{t('diagNoHelp', lang)}</p>
                    <div className="mt-3 flex flex-col gap-3">
                        <button autoFocus onClick={() => setPhase('quiz')} className={`${bigButton} border-sky-900 bg-sky-700 text-white`}>
                            {t('diagStart', lang)}
                        </button>
                        <button onClick={onBack} className={`${bigButton} border-amber-400 bg-amber-200 text-amber-950`}>
                            {t('backToMap', lang)}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'result') {
        const summary = summariseDiagnostic(answers);
        const focusList = summary.focus.map((g) => tp('diagGroupLabel', lang, { n: g })).join(lang === 'en' ? ', ' : '、');
        const target = recommendedGrade4SkillId(user.stars, user.facts);
        return (
            <div className={cardShell}>
                <div className={card} data-testid="diagnostic-result">
                    <h1 className="mb-1 text-3xl font-black text-sky-900">{t('diagResultTitle', lang)}</h1>
                    <p className="mb-3 text-xl font-bold text-amber-950" data-testid="diagnostic-focus">
                        {summary.focus.length === 0
                            ? t('diagAllGood', lang)
                            : tp(summary.focus.length === 1 ? 'diagFocusOne' : 'diagFocusMany', lang, { list: focusList })}
                    </p>
                    <ul className="grid grid-cols-3 gap-2">
                        {summary.groups.map((g) => {
                            const style = STATUS_STYLE[g.status];
                            return (
                                <li
                                    key={g.group}
                                    data-status={g.status}
                                    className={`flex min-h-[64px] flex-col items-center justify-center rounded-xl border-[3px] px-1 py-1 leading-tight ${style.cls}`}
                                >
                                    <span className="text-xl font-black">{tp('diagGroupLabel', lang, { n: g.group })}</span>
                                    <span className="text-sm font-extrabold">
                                        <span aria-hidden="true">{style.symbol} </span>
                                        {t(style.label, lang)}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                    <div className="mt-4 flex flex-col gap-3">
                        <button autoFocus onClick={() => onStart(target)} className={`${bigButton} border-green-900 bg-green-700 text-white`}>
                            {t('diagStartPractice', lang)}
                        </button>
                        <button onClick={onBack} className={`${bigButton} border-amber-400 bg-amber-200 text-amber-950`}>
                            {t('backToMap', lang)}
                        </button>
                    </div>
                    {summary.slowFacts.length > 0 && (
                        <div className="mt-4 text-left">
                            <p className="text-base font-black text-amber-950">{t('diagSlowTitle', lang)}</p>
                            <ul className="mt-1 flex flex-wrap gap-2">
                                {summary.slowFacts.map((f) => (
                                    <li key={f.factKey} className="rounded-lg bg-yellow-100 px-2 py-1 text-base font-bold text-amber-950">
                                        {tp('diagSlowFact', lang, { eq: f.equation, s: f.seconds })}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <p className="mt-4 text-base font-semibold text-stone-800">{t('diagChartNote', lang)}</p>
                </div>
            </div>
        );
    }

    const top = (
        <PracticeTopRow onBack={onBack} backLabel={t('exit', lang)} backText={t('exit', lang)}>
            <TopChip role="status">{tp('questionProgress', lang, { n: index + 1, total: DIAGNOSTIC_COUNT })}</TopChip>
        </PracticeTopRow>
    );

    const upper = (
        <>
            <EquationBox text={current ? `${current.left} ${current.operator} ${current.right} = ?` : ''} isKinder={false} />
            <div className={`${ANSWER_HEIGHT} ${ANSWER_FONT} flex w-full max-w-xs flex-col items-center justify-center rounded-2xl border-[5px] border-[#e6ccb2] bg-[#2c3e50] font-bold leading-none text-white shadow-inner`}>
                {answer}
            </div>
        </>
    );

    const lower = (
        <>
            <Keypad deleteLabel={t('deleteKey', lang)} onDigit={appendDigit} onBackspace={backspace} />
            <SubmitButton onClick={submit} disabled={answer === ''} label={`${t('submit', lang)} ✅`} />
        </>
    );

    return <PracticeShell background="from-sky-300 via-sky-100 to-green-400" top={top} upper={upper} lower={lower} />;
};
