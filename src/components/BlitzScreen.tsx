import React, { useEffect, useRef, useState } from 'react';
import { useCurrentUser, useGameStore, type BlitzRecordResult } from '../store/useGameStore';
import { audioService } from '../services/audioService';
import { BLITZ_SECONDS } from '../utils/blitz';
import { t, tp } from '../utils/i18n';
import { buildBlitzQuestions } from '../utils/mathEngine';
import { Confetti } from './Confetti';

const QUESTION_POOL_SIZE = 200;
const TICK_MS = 200;
const CORRECT_MS = 350;
const WRONG_MS = 1200;

type Phase = 'ready' | 'playing' | 'done';
type Feedback = 'none' | 'correct' | 'wrong';

const fmt = (n: number | null): string => (n === null ? '?' : String(n));

const Round: React.FC<{ onBack: () => void; onAgain: () => void }> = ({ onBack, onAgain }) => {
    const user = useCurrentUser();
    const recordBlitz = useGameStore((s) => s.recordBlitz);
    const [questions] = useState(() => buildBlitzQuestions(user?.facts ?? {}, Math.random, QUESTION_POOL_SIZE));
    const [phase, setPhase] = useState<Phase>('ready');
    const [index, setIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [feedback, setFeedback] = useState<Feedback>('none');
    const [score, setScore] = useState(0);
    const [remainingMs, setRemainingMs] = useState(BLITZ_SECONDS * 1000);
    const [result, setResult] = useState<BlitzRecordResult | null>(null);

    const scoreRef = useRef(0);
    const endAtRef = useRef(0);
    const doneRef = useRef(false);
    const intervalRef = useRef<number | undefined>(undefined);
    const timeoutRef = useRef<number | undefined>(undefined);
    const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

    useEffect(
        () => () => {
            window.clearInterval(intervalRef.current);
            window.clearTimeout(timeoutRef.current);
        },
        [],
    );

    const finish = () => {
        if (doneRef.current) return;
        doneRef.current = true;
        window.clearInterval(intervalRef.current);
        window.clearTimeout(timeoutRef.current);
        setResult(recordBlitz(scoreRef.current) ?? { best: scoreRef.current, newRecord: false, ticket: false });
        setPhase('done');
        audioService.playWin();
    };

    const start = () => {
        endAtRef.current = Date.now() + BLITZ_SECONDS * 1000;
        setRemainingMs(BLITZ_SECONDS * 1000);
        setPhase('playing');
        intervalRef.current = window.setInterval(() => {
            const left = Math.max(0, endAtRef.current - Date.now());
            setRemainingMs(left);
            if (left <= 0) finish();
        }, TICK_MS);
    };

    const current = questions[index];

    const appendDigit = (digit: number) => {
        if (phase !== 'playing' || feedback !== 'none') return;
        setAnswer((prev) => (prev + digit).slice(0, 2));
    };
    const backspace = () => {
        if (phase !== 'playing' || feedback !== 'none') return;
        setAnswer((prev) => prev.slice(0, -1));
    };
    const submit = () => {
        if (phase !== 'playing' || feedback !== 'none' || answer === '' || !current) return;
        const ok = Number(answer) === current.answer;
        if (ok) {
            scoreRef.current += 1;
            setScore(scoreRef.current);
            audioService.playCorrect();
        } else {
            audioService.playGentleIncorrect();
        }
        setFeedback(ok ? 'correct' : 'wrong');
        timeoutRef.current = window.setTimeout(
            () => {
                if (doneRef.current) return;
                setIndex((i) => i + 1);
                setAnswer('');
                setFeedback('none');
            },
            ok ? CORRECT_MS : WRONG_MS,
        );
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
    const secondsLeft = Math.ceil(remainingMs / 1000);
    const keyClass = 'min-h-16 text-4xl bg-[#d4a373] text-white border-b-[6px] border-[#bc8a5f] font-black rounded-2xl shadow-md active:translate-y-1 active:border-b-0 transition';
    const bigButton = 'min-h-[72px] w-full text-2xl font-black rounded-2xl border-b-8 transition active:translate-y-1 active:border-b-4';

    if (phase === 'done' && result) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 flex flex-col items-center justify-center p-4 font-sans">
                {result.newRecord && <Confetti />}
                <div className="w-full max-w-md rounded-3xl border-[6px] border-[#d4a373] bg-white/95 p-6 text-center shadow-2xl">
                    <h2 className="mb-2 text-3xl font-black text-green-800">{t('blitzTimeUp', lang)}</h2>
                    <p className="text-xl font-bold text-amber-800">{t('blitzScoreLabel', lang)}</p>
                    <p className="mb-2 text-7xl font-black text-amber-600" data-testid="blitz-score">
                        {score}
                    </p>
                    {result.newRecord && <p className="text-2xl font-black text-purple-600">{t('blitzNewRecord', lang)}</p>}
                    <p className="mb-2 text-lg font-bold text-amber-900">{tp('blitzBestLabel', lang, { n: result.best })}</p>
                    {result.ticket && <div className="mb-2 rounded-xl bg-sky-100 px-3 py-2 text-base font-bold text-amber-900">{t('blitzTicket', lang)}</div>}
                    <div className="mt-3 flex flex-col gap-3">
                        <button onClick={onAgain} className={`${bigButton} border-orange-700 bg-orange-500 text-white`}>
                            {t('blitzAgain', lang)}
                        </button>
                        <button onClick={onBack} className={`${bigButton} border-amber-400 bg-amber-200 text-amber-900`}>
                            {t('backToMap', lang)}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'ready') {
        return (
            <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 flex flex-col items-center justify-center p-4 font-sans">
                <div className="w-full max-w-md rounded-3xl border-[6px] border-[#d4a373] bg-white/95 p-6 text-center shadow-2xl">
                    <h1 className="mb-2 text-3xl font-black text-orange-600">{t('blitzTitle', lang)}</h1>
                    <p className="mb-1 text-xl font-bold text-amber-900">{t('blitzIntro', lang)}</p>
                    {user.blitzBest > 0 && <p className="mb-3 text-lg font-bold text-amber-800">{tp('blitzBestLabel', lang, { n: user.blitzBest })}</p>}
                    <div className="mt-3 flex flex-col gap-3">
                        <button data-autofocus onClick={start} className={`${bigButton} border-orange-700 bg-orange-500 text-white`}>
                            {t('blitzStart', lang)}
                        </button>
                        <button onClick={onBack} className={`${bigButton} border-amber-400 bg-amber-200 text-amber-900`}>
                            {t('backToMap', lang)}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const wrong = feedback === 'wrong';
    const background = feedback === 'correct' ? 'from-green-300 to-green-500' : wrong ? 'from-amber-200 to-amber-300' : 'from-sky-300 via-sky-100 to-green-400';

    return (
        <div className={`min-h-screen flex flex-col p-4 font-sans bg-gradient-to-b ${background}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
                <button
                    onClick={() => {
                        window.clearInterval(intervalRef.current);
                        window.clearTimeout(timeoutRef.current);
                        onBack();
                    }}
                    aria-label={t('exit', lang)}
                    className="min-h-12 rounded-xl border-2 border-amber-900/10 bg-white/50 px-4 text-lg font-bold text-amber-900"
                >
                    🏠
                </button>
                <div role="timer" className="rounded-xl border-2 border-green-900/10 bg-white/50 px-4 py-2 text-xl font-black text-green-900">
                    {tp('secondsLeft', lang, { n: secondsLeft })}
                </div>
                <div className="rounded-xl border-2 border-green-900/10 bg-white/50 px-4 py-2 text-xl font-black text-orange-600" data-testid="blitz-live-score">
                    ⭐ {score}
                </div>
            </div>
            <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-white/60" aria-hidden="true">
                <div className="h-full bg-orange-500" style={{ width: `${(remainingMs / (BLITZ_SECONDS * 1000)) * 100}%` }} />
            </div>

            <div className="mb-6 flex flex-1 flex-col items-center justify-center">
                <div className="mb-4 max-w-full whitespace-nowrap rounded-3xl border-4 border-amber-900/20 bg-white/60 px-4 py-4 text-5xl font-black tracking-wider text-amber-900 shadow-xl sm:text-7xl">
                    {current ? `${fmt(current.left)} ${current.operator} ${fmt(current.right)} = ${fmt(current.result)}` : ''}
                </div>
                {wrong && current && <div className="mb-2 text-xl font-black text-amber-900">{t('theAnswerIs', lang)}</div>}
                <div
                    className={`flex h-28 w-full max-w-xs items-center justify-center rounded-2xl border-8 bg-[#2c3e50] text-5xl font-bold shadow-inner ${
                        feedback === 'correct' ? 'border-green-400 text-green-300' : wrong ? 'border-amber-400 text-amber-200' : 'border-[#e6ccb2] text-white'
                    }`}
                >
                    {wrong && current ? current.answer : answer}
                </div>
            </div>

            <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <button key={n} onClick={() => appendDigit(n)} className={keyClass}>
                        {n}
                    </button>
                ))}
                <div />
                <button onClick={() => appendDigit(0)} className={keyClass}>
                    0
                </button>
                <button onClick={backspace} className="min-h-16 rounded-2xl border-b-[6px] border-[#d4a373] bg-[#e6ccb2] text-4xl font-black text-amber-900 shadow-md transition active:translate-y-1 active:border-b-0">
                    ⌫
                </button>
            </div>
            <div className="mx-auto mt-4 w-full max-w-sm">
                <button
                    onClick={submit}
                    disabled={answer === '' || feedback !== 'none'}
                    className="min-h-16 w-full rounded-2xl border-b-8 border-green-700 bg-green-500 text-3xl font-black text-white transition active:translate-y-2 active:border-b-0 disabled:border-green-300 disabled:bg-green-200"
                >
                    {t('submit', lang)} ✅
                </button>
            </div>
        </div>
    );
};

export const BlitzScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [round, setRound] = useState(0);
    return <Round key={round} onBack={onBack} onAgain={() => setRound((r) => r + 1)} />;
};
