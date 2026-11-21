import React, { useEffect, useRef, useState } from 'react';
import { useCurrentUser, useGameStore, type BlitzRecordResult } from '../store/useGameStore';
import { audioService } from '../services/audioService';
import { BLITZ_SECONDS } from '../utils/blitz';
import { t, tp } from '../utils/i18n';
import { buildBlitzQuestions } from '../utils/mathEngine';
import { Confetti } from './Confetti';
import { ANSWER_FONT, ANSWER_HEIGHT, EquationBox, Keypad, PracticeShell, PracticeTopRow, SubmitButton, TopChip } from './PracticeParts';

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
    const bigButton = 'min-h-[72px] w-full text-2xl font-black rounded-2xl border-b-8 transition active:translate-y-1 active:border-b-4';
    const cardShell = 'min-h-dvh bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 flex flex-col items-center justify-center px-4 py-6 font-sans';
    const card = 'w-full max-w-[520px] rounded-3xl border-[6px] border-[#d4a373] bg-white p-6 text-center shadow-2xl';

    if (phase === 'done' && result) {
        return (
            <div className={cardShell}>
                {result.newRecord && <Confetti />}
                <div className={`${card} relative z-50`}>
                    <h2 className="mb-2 text-3xl font-black text-green-800">{t('blitzTimeUp', lang)}</h2>
                    <p className="text-xl font-bold text-amber-900">{t('blitzScoreLabel', lang)}</p>
                    <p className="mb-2 text-7xl font-black text-amber-700" data-testid="blitz-score">
                        {score}
                    </p>
                    {result.newRecord && <p className="text-2xl font-black text-purple-700">{t('blitzNewRecord', lang)}</p>}
                    <p className="mb-2 text-xl font-bold text-amber-950">{tp('blitzBestLabel', lang, { n: result.best })}</p>
                    {result.ticket && <div className="mb-2 rounded-xl bg-sky-100 px-3 py-2 text-lg font-bold text-amber-950">{t('blitzTicket', lang)}</div>}
                    <div className="mt-3 flex flex-col gap-3">
                        <button onClick={onAgain} className={`${bigButton} border-orange-800 bg-orange-600 text-white`}>
                            {t('blitzAgain', lang)}
                        </button>
                        <button onClick={onBack} className={`${bigButton} border-amber-400 bg-amber-200 text-amber-950`}>
                            {t('backToMap', lang)}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'ready') {
        return (
            <div className={cardShell}>
                <div className={card}>
                    <h1 className="mb-2 text-3xl font-black text-orange-700">{t('blitzTitle', lang)}</h1>
                    <p className="mb-1 text-xl font-bold text-amber-950">{t('blitzIntro', lang)}</p>
                    {user.blitzBest > 0 && <p className="mb-3 text-xl font-bold text-amber-900">{tp('blitzBestLabel', lang, { n: user.blitzBest })}</p>}
                    <div className="mt-3 flex flex-col gap-3">
                        <button autoFocus onClick={start} className={`${bigButton} border-orange-800 bg-orange-600 text-white`}>
                            {t('blitzStart', lang)}
                        </button>
                        <button onClick={onBack} className={`${bigButton} border-amber-400 bg-amber-200 text-amber-950`}>
                            {t('backToMap', lang)}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const wrong = feedback === 'wrong';
    const background = feedback === 'correct' ? 'from-green-300 to-green-500' : wrong ? 'from-amber-200 to-amber-300' : 'from-sky-300 via-sky-100 to-green-400';
    const boxBorder = feedback === 'correct' ? 'border-green-400 text-green-300' : wrong ? 'border-amber-400 text-amber-200' : 'border-[#e6ccb2] text-white';

    const top = (
        <>
            <PracticeTopRow
                onBack={() => {
                    window.clearInterval(intervalRef.current);
                    window.clearTimeout(timeoutRef.current);
                    onBack();
                }}
                backLabel={t('exit', lang)}
            >
                <TopChip role="timer">{tp('secondsLeft', lang, { n: secondsLeft })}</TopChip>
                <TopChip className="text-orange-800" testId="blitz-live-score">
                    ⭐ {score}
                </TopChip>
            </PracticeTopRow>
            <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-white/70" aria-hidden="true">
                <div className="h-full bg-orange-600" style={{ width: `${(remainingMs / (BLITZ_SECONDS * 1000)) * 100}%` }} />
            </div>
        </>
    );

    const upper = (
        <>
            <EquationBox text={current ? `${fmt(current.left)} ${current.operator} ${fmt(current.right)} = ${fmt(current.result)}` : ''} isKinder />
            <div className={`${ANSWER_HEIGHT} ${ANSWER_FONT} flex w-full max-w-xs flex-col items-center justify-center rounded-2xl border-[5px] bg-[#2c3e50] font-bold leading-none shadow-inner ${boxBorder}`}>
                {wrong && current && <span className="mb-0.5 text-sm font-bold leading-none text-amber-100">{t('theAnswerIs', lang)}</span>}
                {wrong && current ? current.answer : answer}
            </div>
        </>
    );

    const lower = (
        <>
            <Keypad deleteLabel={t('deleteKey', lang)} onDigit={appendDigit} onBackspace={backspace} />
            <SubmitButton onClick={submit} disabled={answer === '' || feedback !== 'none'} label={`${t('submit', lang)} ✅`} />
        </>
    );

    return <PracticeShell background={background} top={top} upper={upper} lower={lower} />;
};

export const BlitzScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [round, setRound] = useState(0);
    return <Round key={round} onBack={onBack} onAgain={() => setRound((r) => r + 1)} />;
};
