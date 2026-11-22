import React, { useEffect, useRef, useState } from 'react';
import { getSkill, skillsForMode, skillsForTrack } from '../data/skills';
import { parseTableKey } from '../data/tableFacts';
import { useCurrentUser, useGameStore, type SessionSummary } from '../store/useGameStore';
import { audioService } from '../services/audioService';
import { t, tp, type TranslationKey } from '../utils/i18n';
import { buildFactSession, buildKinderSession, checkAnswer, generateSession, type Question } from '../utils/mathEngine';
import { fullEquation } from '../utils/equation';
import { isTableTrackSkill } from '../utils/tracks';
import { questionCoins } from '../utils/rewards';
import { QUESTION_COUNT, aidModeFor, insertRetry, realQuestionNumber, resolveSubmit, type AidMode } from '../utils/session';
import { dayKey } from '../utils/streak';
import { ResultScreen } from './ResultScreen';
import { ANSWER_FONT, ANSWER_HEIGHT, EquationBox, Keypad, MessageSlot, PracticeShell, PracticeTopRow, SubmitButton, ToggleKey, TopChip } from './PracticeParts';
import { ArrayAid } from './ArrayAid';
import { TenFrame } from './TenFrame';

const MAX_DIGITS = { kinder: 2, grade4: 8 } as const;
const TABLE_MAX_DIGITS = 2;

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
    const isTable = !isKinder && isTableTrackSkill(skillId);
    /** Fact sessions (kinder and times tables): retries, gentle feedback, per-fact tracking. */
    const isFact = isKinder || isTable;
    const skill = getSkill(skillId);
    const totalQuestions = QUESTION_COUNT[mode];

    // Facts as they were when the session started (to count newly mastered facts at the end).
    const factsBeforeRef = useRef(user?.facts ?? {});

    // Generated once on mount; a wrong kinder answer is re-asked 3 questions later.
    const [queue, setQueue] = useState<QueueItem[]>(() => {
        if (isTable) {
            const facts = user?.facts ?? {};
            return buildFactSession(skillId, facts, dayKey(new Date()), totalQuestions, Math.random).map((question) => ({
                question,
                isRetry: false,
                aid: aidModeFor(skillId, question.factKey ? facts[question.factKey] : undefined),
            }));
        }
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
    const isDivision = current?.operator === '÷' && !isTable; // table divisions have a single answer box
    const maxDigits = isTable ? TABLE_MAX_DIGITS : MAX_DIGITS[mode];

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
        if (isFact && !item.isRetry && current.factKey) {
            const retrievalMs = (firstDigitAtRef.current ?? Date.now()) - startTimeRef.current;
            bonusCoins = recordFact(current.factKey, ok, retrievalMs, helped)?.bonusCoins ?? 0;
            if (bonusCoins > 0) nextBonusFacts = [...bonusFacts, current.factKey];
        }
        const outcome = resolveSubmit({
            isRetry: item.isRetry,
            ok,
            isKinder: isFact,
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
        else if (isFact) audioService.playGentleIncorrect();
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
            ok ? 1000 : isFact ? 2500 : 2000,
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
        const list = isTable ? skillsForTrack('grade4', 'table') : skillsForMode(user.mode);
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

    const wrongForKinder = feedback === 'incorrect' && isFact; // gentle (amber) wrong-answer style
    const background =
        feedback === 'correct'
            ? 'from-green-300 to-green-500'
            : feedback === 'incorrect' && !isFact
              ? 'from-red-200 to-red-400'
              : wrongForKinder
                ? 'from-amber-200 to-amber-300'
                : 'from-sky-300 via-sky-100 to-green-400';

    const boxClass = (box: Box) => {
        const border =
            feedback === 'correct'
                ? 'border-green-400 text-green-300'
                : feedback === 'incorrect' && !isFact
                  ? 'border-red-500 text-red-300'
                  : wrongForKinder
                    ? 'border-amber-400 text-amber-200'
                    : activeBox === box || !isDivision
                      ? 'border-[#e6ccb2] text-white'
                      : 'border-[#8b5a2b] text-[#e5e5e5]';
        return `${ANSWER_HEIGHT} ${ANSWER_FONT} bg-[#2c3e50] rounded-2xl border-[5px] flex flex-col items-center justify-center leading-none font-bold shadow-inner ${border}`;
    };

    // A wrong answer immediately shows the correct answer (and, for kinder, the ten-frame).
    const showCorrection = feedback === 'incorrect';
    const hasFrame = isKinder && current.factKey !== undefined;
    const showFrame = hasFrame && (currentItem.aid === 'visible' || (currentItem.aid === 'help' && aidShown) || feedback === 'incorrect');
    // Table facts: the array aid fades like the ten-frame; after a wrong answer it shows for x facts.
    const tableFact = isTable && current.factKey ? parseTableKey(current.factKey) : null;
    const showArray =
        tableFact !== null &&
        (currentItem.aid === 'visible' || (currentItem.aid === 'help' && aidShown) || (feedback === 'incorrect' && tableFact.op === '×'));
    const showHelp = (hasFrame || tableFact !== null) && currentItem.aid === 'help' && !aidShown && feedback === 'none';
    const correctionLabel = t(isFact ? 'theAnswerIs' : 'correctAnswerWas', lang);
    const labelClass = 'mb-0.5 text-sm font-bold leading-none text-amber-100';
    const chip = 'rounded-2xl bg-white px-4 py-0.5 text-amber-950 shadow';

    const top = (
        <PracticeTopRow onBack={onBack} backLabel={t('exit', lang)} backText={isKinder ? undefined : t('exit', lang)}>
            <TopChip>
                {t('questionProgress', lang)
                    .replace('{n}', String(Math.min(realQuestionNumber(queue, index), totalQuestions)))
                    .replace('{total}', String(totalQuestions))}
                {currentItem.isRetry && <span className="ml-2">{t('retryMarker', lang)}</span>}
            </TopChip>
        </PracticeTopRow>
    );

    const upper = (
        <>
            <EquationBox text={formatQuestion(current)} isKinder={isKinder} tint={wrongForKinder ? 'bg-amber-50' : 'bg-white'} />

            {showFrame && <TenFrame question={current} lang={lang} />}
            {showArray && <ArrayAid question={current} lang={lang} />}
            {showHelp && (
                <button
                    onClick={() => setAidShown(true)}
                    className="h-[clamp(56px,8dvh,72px)] min-w-[72px] rounded-2xl border-b-[6px] border-yellow-700 bg-yellow-300 px-6 text-2xl font-black text-amber-950 transition active:translate-y-1 active:border-b-0"
                >
                    {t('helpButton', lang)}
                </button>
            )}

            {isDivision ? (
                <div className="flex w-full flex-col items-center gap-1">
                    {showCorrection && !isFact && <div className="text-base font-black leading-none text-red-950">{correctionLabel}</div>}
                    <div className="flex w-full items-center justify-center gap-2">
                        <div onClick={() => feedback === 'none' && setActiveBox('q')} className={`${boxClass('q')} min-w-0 flex-1`}>
                            <span className="mb-0.5 text-sm font-bold uppercase tracking-wider text-slate-200">{t('quotient', lang)}</span>
                            {showCorrection ? fmt(current.answer) : answer}
                        </div>
                        <div className="text-3xl font-black leading-none text-amber-950" aria-hidden="true">
                            …
                        </div>
                        <div onClick={() => feedback === 'none' && setActiveBox('r')} className={`${boxClass('r')} min-w-0 flex-1`}>
                            <span className="mb-0.5 text-sm font-bold uppercase tracking-wider text-slate-200">{t('remainder', lang)}</span>
                            {showCorrection ? fmt(current.remainder ?? 0) : remainder}
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`${boxClass('q')} w-full max-w-xs`}>
                    {showCorrection && <span className={labelClass}>{correctionLabel}</span>}
                    {showCorrection ? (
                        isTable ? <span className="text-[clamp(26px,4.6dvh,44px)]">{fullEquation(current)}</span> : fmt(current.answer)
                    ) : (
                        answer
                    )}
                </div>
            )}

            <MessageSlot>
                {feedback === 'none' && combo >= 2 && (
                    <div className={`${chip} text-lg font-black`}>
                        {tp('comboLabel', lang, { n: combo })} {t(COMBO_PRAISE[Math.min(combo, 5)], lang)}
                    </div>
                )}
                {feedback === 'correct' && (
                    <div className={`${chip} text-xl font-black text-green-800`}>
                        {t('correct', lang)}
                        {combo >= 2 && <span className="ml-2 text-lg text-orange-800">{tp('comboLabel', lang, { n: combo })}</span>}
                    </div>
                )}
                {feedback === 'incorrect' && (
                    <div className={chip}>
                        <div className="text-xl font-black">{t('incorrect', lang)}</div>
                        {isFact && !currentItem.isRetry && <div className="text-base font-bold">{t('tryAgainLater', lang)}</div>}
                        {!isFact && (
                            <div className="text-base font-bold">
                                {t('yourAnswer', lang)} {fmt(Number(answer))}
                                {isDivision && remainder !== '' ? ` ... ${fmt(Number(remainder))}` : ''}
                            </div>
                        )}
                    </div>
                )}
            </MessageSlot>
        </>
    );

    const lower = (
        <>
            <Keypad
                deleteLabel={t('deleteKey', lang)}
                onDigit={appendDigit}
                onBackspace={backspace}
                extra={
                    isDivision ? (
                        <ToggleKey onClick={toggleBox} active={activeBox === 'q'}>
                            {activeBox === 'q' ? t('remainder', lang) : t('quotient', lang)}
                        </ToggleKey>
                    ) : undefined
                }
            />
            <SubmitButton onClick={submit} disabled={answer === '' || feedback !== 'none'} label={`${t('submit', lang)} ✅`} />
        </>
    );

    return <PracticeShell background={background} top={top} upper={upper} lower={lower} />;
};
