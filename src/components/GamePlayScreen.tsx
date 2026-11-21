import React, { useEffect, useRef, useState } from 'react';
import { getSkill } from '../data/skills';
import { useCurrentUser, useGameStore } from '../store/useGameStore';
import { audioService } from '../services/audioService';
import { t } from '../utils/i18n';
import { checkAnswer, generateSession, type Question } from '../utils/mathEngine';
import { questionCoins, sessionBonus } from '../utils/rewards';
import { ObjectAid } from './ObjectAid';

const QUESTION_COUNT = { kinder: 5, grade4: 10 } as const;
const MAX_DIGITS = { kinder: 2, grade4: 8 } as const;
const OBJECT_AID_SKILLS = ['k_add_5', 'k_add_10', 'k_sub_5', 'k_sub_10', 'k_make10'];

interface QueueItem {
    question: Question;
    isRetry: boolean;
}

type Feedback = 'none' | 'correct' | 'incorrect';
type Box = 'q' | 'r';

const fmt = (n: number | null): string => (n === null ? '?' : n.toLocaleString('en-US'));

function formatQuestion(q: Question): string {
    return `${fmt(q.left)} ${q.operator} ${fmt(q.right)} = ${fmt(q.result)}`;
}

interface Props {
    skillId: string;
    onBack: () => void;
}

export const GamePlayScreen: React.FC<Props> = ({ skillId, onBack }) => {
    const user = useCurrentUser();
    const addCoins = useGameStore((s) => s.addCoins);
    const recordAnswer = useGameStore((s) => s.recordAnswer);

    const mode = user?.mode ?? 'grade4';
    const lang = user?.language ?? 'zh-TW';
    const isKinder = mode === 'kinder';
    const skill = getSkill(skillId);
    const totalQuestions = QUESTION_COUNT[mode];

    // Generated once on mount; retries (kinder) are appended to the end of the queue.
    const [queue, setQueue] = useState<QueueItem[]>(() =>
        generateSession(skillId, totalQuestions).map((question) => ({ question, isRetry: false })),
    );
    const [index, setIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [remainder, setRemainder] = useState('');
    const [activeBox, setActiveBox] = useState<Box>('q');
    const [feedback, setFeedback] = useState<Feedback>('none');
    const [correctCount, setCorrectCount] = useState(0);
    const [earnedCoins, setEarnedCoins] = useState(0);
    const [finished, setFinished] = useState<{ coins: number; perfect: boolean } | null>(null);

    const startTimeRef = useRef(0);
    const timerRef = useRef<number | undefined>(undefined);
    const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

    useEffect(() => {
        startTimeRef.current = Date.now();
    }, [index]);

    useEffect(() => () => window.clearTimeout(timerRef.current), []);

    const currentItem = queue[index];
    const current = currentItem?.question;
    const isDivision = current?.operator === '÷';
    const maxDigits = MAX_DIGITS[mode];

    const appendDigit = (digit: number) => {
        if (feedback !== 'none') return;
        const setter = activeBox === 'q' ? setAnswer : setRemainder;
        setter((prev) => (prev + digit).slice(0, maxDigits));
    };

    const backspace = () => {
        if (feedback !== 'none') return;
        (activeBox === 'q' ? setAnswer : setRemainder)((prev) => prev.slice(0, -1));
    };

    const toggleBox = () => {
        if (isDivision && feedback === 'none') setActiveBox((b) => (b === 'q' ? 'r' : 'q'));
    };

    const submit = () => {
        if (!current || feedback !== 'none' || answer === '') return;
        const item = queue[index];
        const timeMs = Date.now() - startTimeRef.current;
        const ok = checkAnswer(current, {
            answer: Number(answer),
            remainder: isDivision ? Number(remainder || 0) : undefined,
        });

        let nextCorrect = correctCount;
        let nextEarned = earnedCoins;
        let nextQueueLength = queue.length;

        // Retries do not count towards stats or coins; only the first attempt does.
        if (!item.isRetry) {
            recordAnswer(skillId, ok, timeMs);
            if (ok) {
                nextCorrect += 1;
                nextEarned += skill ? questionCoins(skill, timeMs) : 0;
            } else if (isKinder) {
                setQueue((prev) => [...prev, { question: current, isRetry: true }]);
                nextQueueLength += 1;
            }
        }

        setCorrectCount(nextCorrect);
        setEarnedCoins(nextEarned);
        setFeedback(ok ? 'correct' : 'incorrect');
        if (ok) audioService.playCorrect();
        else if (isKinder) audioService.playGentleIncorrect();
        else audioService.playIncorrect();

        // Award immediately on the final question so leaving during the feedback delay cannot lose coins.
        const isLast = index + 1 >= nextQueueLength;
        const finalCoins = isLast ? sessionBonus(nextEarned, nextCorrect, totalQuestions) : 0;
        if (isLast) addCoins(finalCoins);

        timerRef.current = window.setTimeout(
            () => {
                if (!isLast) {
                    setIndex(index + 1);
                    setAnswer('');
                    setRemainder('');
                    setActiveBox('q');
                    setFeedback('none');
                } else {
                    audioService.playWin();
                    setFinished({ coins: finalCoins, perfect: nextCorrect === totalQuestions });
                }
            },
            ok ? 1000 : 2000,
        );
    };

    useEffect(() => {
        keyHandlerRef.current = (e) => {
            if (e.key >= '0' && e.key <= '9') appendDigit(Number(e.key));
            else if (e.key === 'Backspace') backspace();
            else if (e.key === 'Enter') submit();
            else if (e.key === 'Tab' && isDivision) {
                e.preventDefault();
                toggleBox();
            }
        };
    });

    useEffect(() => {
        const listener = (e: KeyboardEvent) => keyHandlerRef.current(e);
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, []);

    if (!user || !current) return null;

    if (finished) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 flex flex-col items-center justify-center p-4 font-sans">
                <div className="bg-white/95 p-8 rounded-3xl shadow-2xl text-center max-w-md w-full border-[6px] border-[#d4a373]">
                    <h2 className="text-4xl font-bold text-green-800 mb-4">{t('practiceComplete', lang)}</h2>
                    <p className="text-2xl text-amber-800 mb-2 font-bold">
                        {t('correctCount', lang)}: {correctCount} / {totalQuestions}
                    </p>
                    <p className="text-3xl font-black text-amber-600 mb-2">
                        + {finished.coins} {t('coinsEarned', lang)} 🪙
                    </p>
                    {finished.perfect && <p className="text-lg font-bold text-green-700 mb-6">{t('perfectBonus', lang)}</p>}
                    <button
                        onClick={onBack}
                        className="w-full mt-4 bg-green-500 hover:bg-green-400 text-white text-2xl font-black py-4 rounded-xl border-b-8 border-green-700 transition active:translate-y-2 active:border-b-0"
                    >
                        {t('backToSkills', lang)}
                    </button>
                </div>
            </div>
        );
    }

    const keyHeight = isKinder ? 'min-h-16 text-4xl' : 'min-h-14 text-3xl';
    const wrongForKinder = feedback === 'incorrect' && isKinder;
    const background =
        feedback === 'correct'
            ? 'from-green-300 to-green-500'
            : feedback === 'incorrect' && !isKinder
              ? 'from-red-200 to-red-400'
              : wrongForKinder
                ? 'from-amber-200 to-amber-300'
                : 'from-sky-300 via-sky-100 to-green-400';

    const boxClass = (box: Box) => {
        const border =
            feedback === 'correct'
                ? 'border-green-400 text-green-300'
                : feedback === 'incorrect' && !isKinder
                  ? 'border-red-500 text-red-400'
                  : wrongForKinder
                    ? 'border-amber-400 text-amber-200'
                    : activeBox === box || !isDivision
                      ? 'border-[#e6ccb2] text-white'
                      : 'border-[#8b5a2b] text-[#dddddd]';
        return `h-28 bg-[#2c3e50] rounded-2xl border-8 flex flex-col items-center justify-center text-5xl font-bold shadow-inner ${border}`;
    };

    // Grade4 always sees the correction; kinder only after a wrong retry.
    const showCorrection = feedback === 'incorrect' && (!isKinder || currentItem.isRetry);

    return (
        <div className={`min-h-screen flex flex-col p-4 transition-colors duration-500 font-sans bg-gradient-to-b ${background}`}>
            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={onBack}
                    className="min-h-12 text-amber-900 font-bold text-lg bg-white/50 px-4 rounded-xl border-2 border-amber-900/10"
                >
                    {isKinder ? '🏠' : t('exit', lang)}
                </button>
                <div className="text-xl font-bold text-green-900 bg-white/50 px-4 py-2 rounded-xl border-2 border-green-900/10">
                    {t('questionProgress', lang)
                        .replace('{n}', String(Math.min(index + 1, totalQuestions)))
                        .replace('{total}', String(totalQuestions))}
                    {currentItem.isRetry && <span className="ml-2">{t('retryMarker', lang)}</span>}
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center mb-6">
                <div className={`font-black text-amber-900 tracking-wider mb-4 whitespace-nowrap ${isKinder ? 'text-5xl sm:text-7xl' : 'text-2xl min-[420px]:text-3xl sm:text-5xl'} bg-white/60 px-4 sm:px-6 py-4 rounded-3xl border-4 border-amber-900/20 shadow-xl`}>
                    {formatQuestion(current)}
                </div>

                {isKinder && OBJECT_AID_SKILLS.includes(skillId) && (
                    <div className="mb-4">
                        <ObjectAid question={current} />
                    </div>
                )}

                {showCorrection && (
                    <div className="mb-2 text-xl font-black text-amber-900">
                        {t(isKinder ? 'theAnswerIs' : 'correctAnswerWas', lang)}
                    </div>
                )}

                {isDivision ? (
                    <div className="flex items-center gap-4">
                        <div onClick={() => feedback === 'none' && setActiveBox('q')} className={`${boxClass('q')} w-36`}>
                            <span className="text-xs text-neutral-400 uppercase tracking-widest">{t('quotient', lang)}</span>
                            {showCorrection ? current.answer : answer}
                        </div>
                        <div className="text-5xl font-black text-amber-900">...</div>
                        <div onClick={() => feedback === 'none' && setActiveBox('r')} className={`${boxClass('r')} w-36`}>
                            <span className="text-xs text-neutral-400 uppercase tracking-widest">{t('remainder', lang)}</span>
                            {showCorrection ? (current.remainder ?? 0) : remainder}
                        </div>
                    </div>
                ) : (
                    <div className={`${boxClass('q')} w-full max-w-xs`}>{showCorrection ? current.answer : answer}</div>
                )}

                {feedback === 'correct' && (
                    <div className="mt-4 text-4xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] animate-bounce">
                        {t('correct', lang)}
                    </div>
                )}
                {feedback === 'incorrect' && (
                    <div className="mt-4 text-center text-3xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                        <div>{t('incorrect', lang)}</div>
                        {isKinder && !currentItem.isRetry && <div className="text-xl mt-1">{t('tryAgainLater', lang)}</div>}
                        {!isKinder && (
                            <div className="text-xl mt-1">
                                {t('yourAnswer', lang)} {answer}
                                {isDivision && remainder !== '' ? ` ... ${remainder}` : ''}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        onClick={() => appendDigit(num)}
                        className={`${keyHeight} bg-[#d4a373] text-white border-b-[6px] border-[#bc8a5f] font-black rounded-2xl shadow-md active:translate-y-1 active:border-b-0 transition`}
                    >
                        {num}
                    </button>
                ))}
                {isDivision ? (
                    <button
                        onClick={toggleBox}
                        className={`${keyHeight} text-2xl border-b-[6px] font-black rounded-2xl shadow-md transition active:translate-y-1 active:border-b-0 ${
                            activeBox === 'q'
                                ? 'bg-[#e6ccb2] border-[#d4a373] text-amber-900'
                                : 'bg-[#bc8a5f] border-[#9c6644] text-white'
                        }`}
                    >
                        {activeBox === 'q' ? t('remainder', lang) : t('quotient', lang)}
                    </button>
                ) : (
                    <div />
                )}
                <button
                    onClick={() => appendDigit(0)}
                    className={`${keyHeight} bg-[#d4a373] text-white border-b-[6px] border-[#bc8a5f] font-black rounded-2xl shadow-md active:translate-y-1 active:border-b-0 transition`}
                >
                    0
                </button>
                <button
                    onClick={backspace}
                    className={`${keyHeight} bg-[#e6ccb2] text-amber-900 border-b-[6px] border-[#d4a373] font-black rounded-2xl shadow-md transition active:translate-y-1 active:border-b-0`}
                >
                    ⌫
                </button>
            </div>

            <div className="max-w-sm mx-auto w-full mt-4">
                <button
                    onClick={submit}
                    disabled={answer === '' || feedback !== 'none'}
                    className="w-full min-h-16 bg-green-500 disabled:bg-green-200 disabled:border-green-300 text-white border-b-[8px] border-green-700 text-3xl font-black rounded-2xl transition active:translate-y-2 active:border-b-0"
                >
                    {t('submit', lang)} ✅
                </button>
            </div>
        </div>
    );
};
