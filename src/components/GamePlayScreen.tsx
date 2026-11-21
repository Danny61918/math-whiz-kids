import React, { useEffect, useRef, useState } from 'react';
import { getSkill, skillsForMode } from '../data/skills';
import { useCurrentUser, useGameStore, type SessionSummary } from '../store/useGameStore';
import { audioService } from '../services/audioService';
import { t, tp, type TranslationKey } from '../utils/i18n';
import { buildKinderSession, checkAnswer, generateSession, type Question } from '../utils/mathEngine';
import { questionCoins } from '../utils/rewards';
import { QUESTION_COUNT, aidModeFor, insertRetry, realQuestionNumber, resolveSubmit, type AidMode } from '../utils/session';
import { dayKey } from '../utils/streak';
import { ResultScreen } from './ResultScreen';
import { TenFrame } from './TenFrame';

const MAX_DIGITS = { kinder: 2, grade4: 8 } as const;

interface QueueItem {
    question: Question;
    isRetry: boolean;
    aid: AidMode; // ten-frame visibility, decided from the fact's box when the question was built
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
    onNext: (skillId: string) => void;
    onOpenPack: () => void;
}

const COMBO_PRAISE: Record<number, TranslationKey> = {
    2: 'comboPraise2',
    3: 'comboPraise3',
    4: 'comboPraise4',
    5: 'comboPraise5',
};

export const GamePlayScreen: React.FC<Props> = ({ skillId, onBack, onNext, onOpenPack }) => {
    const user = useCurrentUser();
    const addCoins = useGameStore((s) => s.addCoins);
    const recordAnswer = useGameStore((s) => s.recordAnswer);
    const recordFact = useGameStore((s) => s.recordFact);
    const completeSession = useGameStore((s) => s.completeSession);

    const mode = user?.mode ?? 'grade4';
    const lang = user?.language ?? 'zh-TW';
    const isKinder = mode === 'kinder';
    const skill = getSkill(skillId);
    const totalQuestions = QUESTION_COUNT[mode];

    // Facts as they were when the session started (to count newly mastered facts at the end).
    const factsBeforeRef = useRef(user?.facts ?? {});

    // Generated once on mount; a wrong kinder answer is re-asked 3 questions later.
    const [queue, setQueue] = useState<QueueItem[]>(() => {
        if (!isKinder) {
            return generateSession(skillId, totalQuestions).map((question) => ({ question, isRetry: false, aid: 'none' as const }));
        }
        const facts = user?.facts ?? {};
        return buildKinderSession(skillId, facts, dayKey(new Date()), totalQuestions, Math.random).map((question) => ({
            question,
            isRetry: false,
            aid: aidModeFor(skillId, question.factKey ? facts[question.factKey] : undefined),
        }));
    });
    const [index, setIndex] = useState(0);
    const [answer, setAnswer] = useState('');
    const [remainder, setRemainder] = useState('');
    const [activeBox, setActiveBox] = useState<Box>('q');
    const [feedback, setFeedback] = useState<Feedback>('none');
    const [correctCount, setCorrectCount] = useState(0);
    const [earnedCoins, setEarnedCoins] = useState(0);
    const [finished, setFinished] = useState<{ coins: number; perfect: boolean; correct: number; summary: SessionSummary | null } | null>(null);
    const [combo, setCombo] = useState(0);
    const [aidShown, setAidShown] = useState(false); // Help button pressed for this question
    const [extraCoins, setExtraCoins] = useState(0); // one-time fact bonuses collected this session
    const [bonusFacts, setBonusFacts] = useState<string[]>([]); // facts whose box-5 bonus is in that total

    const startTimeRef = useRef(0);
    const firstDigitAtRef = useRef<number | null>(null); // time of the first digit = retrieval time
    const timerRef = useRef<number | undefined>(undefined);
    const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});

    useEffect(() => {
        startTimeRef.current = Date.now();
        firstDigitAtRef.current = null;
    }, [index]);

    useEffect(() => () => window.clearTimeout(timerRef.current), []);

    const currentItem = queue[index];
    const current = currentItem?.question;
    const isDivision = current?.operator === '÷';
    const maxDigits = MAX_DIGITS[mode];

    const appendDigit = (digit: number) => {
        if (feedback !== 'none') return;
        firstDigitAtRef.current ??= Date.now();
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

        // Retries do not count towards stats or coins; only the first attempt does.
        const helped = aidShown && !item.isRetry;
        let bonusCoins = 0;
        let nextBonusFacts = bonusFacts;
        if (isKinder && !item.isRetry && current.factKey) {
            const retrievalMs = (firstDigitAtRef.current ?? Date.now()) - startTimeRef.current;
            bonusCoins = recordFact(current.factKey, ok, retrievalMs, helped)?.bonusCoins ?? 0;
            if (bonusCoins > 0) nextBonusFacts = [...bonusFacts, current.factKey];
        }
        const outcome = resolveSubmit({
            isRetry: item.isRetry,
            ok,
            isKinder,
            index,
            queueLength: queue.length,
            earned: earnedCoins,
            correct: correctCount,
            total: totalQuestions,
            questionCoins: skill ? questionCoins(skill, timeMs, helped) : 0,
            extra: extraCoins,
            bonusCoins,
        });
        const { nextCorrect, nextEarned, nextExtra, isLast, finalCoins } = outcome;
        if (outcome.countsForStats) recordAnswer(skillId, ok, timeMs);
        if (outcome.countsForStats) setCombo(ok ? combo + 1 : 0);
        if (outcome.appendRetry) {
            setQueue((prev) => insertRetry(prev, { question: current, isRetry: true, aid: 'visible' }, outcome.insertAt));
        }

        setCorrectCount(nextCorrect);
        setEarnedCoins(nextEarned);
        setExtraCoins(nextExtra);
        setBonusFacts(nextBonusFacts);
        setFeedback(ok ? 'correct' : 'incorrect');
        if (ok) audioService.playCorrect();
        else if (isKinder) audioService.playGentleIncorrect();
        else audioService.playIncorrect();

        // Award immediately on the final question so leaving during the feedback delay cannot lose coins.
        let summary: SessionSummary | null = null;
        if (isLast) {
            addCoins(finalCoins);
            summary = completeSession({ skillId, correct: nextCorrect, total: totalQuestions, factsBefore: factsBeforeRef.current, paidFacts: nextBonusFacts });
        }

        timerRef.current = window.setTimeout(
            () => {
                if (!isLast) {
                    setIndex(index + 1);
                    setAnswer('');
                    setRemainder('');
                    setActiveBox('q');
                    setAidShown(false);
                    setFeedback('none');
                } else {
                    audioService.playWin();
                    setFinished({ coins: finalCoins, perfect: nextCorrect === totalQuestions, correct: nextCorrect, summary });
                }
            },
            ok ? 1000 : isKinder ? 2500 : 2000,
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
        const list = skillsForMode(user.mode);
        const position = list.findIndex((sk) => sk.id === skillId);
        const next = position >= 0 ? list[position + 1] : undefined;
        return (
            <ResultScreen
                user={user}
                summary={finished.summary}
                correctCount={finished.correct}
                totalQuestions={totalQuestions}
                coins={finished.coins}
                perfect={finished.perfect}
                hasNext={next !== undefined}
                onNext={() => next && onNext(next.id)}
                onMap={onBack}
                onOpenPack={onOpenPack}
            />
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

    // A wrong answer immediately shows the correct answer (and, for kinder, the ten-frame).
    const showCorrection = feedback === 'incorrect';
    const hasFrame = isKinder && current.factKey !== undefined;
    const showFrame = hasFrame && (currentItem.aid === 'visible' || (currentItem.aid === 'help' && aidShown) || feedback === 'incorrect');
    const showHelp = hasFrame && currentItem.aid === 'help' && !aidShown && feedback === 'none';

    return (
        <div className={`min-h-screen flex flex-col p-4 transition-colors duration-500 font-sans bg-gradient-to-b ${background}`}>
            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={onBack}
                    aria-label={t('exit', lang)}
                    className={`${isKinder ? 'min-h-[72px] min-w-[72px] text-3xl' : 'min-h-12 text-lg'} text-amber-900 font-bold bg-white/50 px-4 rounded-xl border-2 border-amber-900/10`}
                >
                    {isKinder ? '🏠' : t('exit', lang)}
                </button>
                <div className="text-xl font-bold text-green-900 bg-white/50 px-4 py-2 rounded-xl border-2 border-green-900/10">
                    {t('questionProgress', lang)
                        .replace('{n}', String(Math.min(realQuestionNumber(queue, index), totalQuestions)))
                        .replace('{total}', String(totalQuestions))}
                    {currentItem.isRetry && <span className="ml-2">{t('retryMarker', lang)}</span>}
                </div>
            </div>

            {combo >= 2 && (
                <div className="mb-2 text-center text-2xl font-black text-orange-600" aria-live="polite">
                    {tp('comboLabel', lang, { n: combo })} {t(COMBO_PRAISE[Math.min(combo, 5)], lang)}
                </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center mb-6">
                <div className={`font-black text-amber-900 tracking-wider mb-4 max-w-full overflow-x-auto whitespace-nowrap ${isKinder ? 'text-5xl sm:text-7xl' : 'text-2xl min-[420px]:text-3xl sm:text-5xl'} bg-white/60 px-4 sm:px-6 py-4 rounded-3xl border-4 border-amber-900/20 shadow-xl`}>
                    {formatQuestion(current)}
                </div>

                {showFrame && (
                    <div className="mb-4">
                        <TenFrame question={current} lang={lang} />
                    </div>
                )}
                {showHelp && (
                    <button
                        onClick={() => setAidShown(true)}
                        className="mb-4 min-h-[72px] min-w-[72px] rounded-2xl border-b-[6px] border-yellow-600 bg-yellow-300 px-6 text-3xl font-black text-amber-900 transition active:translate-y-1 active:border-b-0"
                    >
                        {t('helpButton', lang)}
                    </button>
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
                            {showCorrection ? fmt(current.answer) : answer}
                        </div>
                        <div className="text-5xl font-black text-amber-900">...</div>
                        <div onClick={() => feedback === 'none' && setActiveBox('r')} className={`${boxClass('r')} w-36`}>
                            <span className="text-xs text-neutral-400 uppercase tracking-widest">{t('remainder', lang)}</span>
                            {showCorrection ? fmt(current.remainder ?? 0) : remainder}
                        </div>
                    </div>
                ) : (
                    <div className={`${boxClass('q')} w-full max-w-xs`}>{showCorrection ? fmt(current.answer) : answer}</div>
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
                                {t('yourAnswer', lang)} {fmt(Number(answer))}
                                {isDivision && remainder !== '' ? ` ... ${fmt(Number(remainder))}` : ''}
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
