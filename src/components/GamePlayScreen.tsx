import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { generateQuestion, type Question } from '../utils/mathEngine';
import { audioService } from '../services/audioService';
import { t } from '../utils/i18n';

export const GamePlayScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { settings, addCoins, language } = useGameStore();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentAnswer, setCurrentAnswer] = useState('');
    const [currentRemainder, setCurrentRemainder] = useState('');
    const [activeBox, setActiveBox] = useState<'q' | 'r'>('q');
    const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [earnedCoins, setEarnedCoins] = useState(0);
    const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());

    useEffect(() => {
        // Generate questions on mount
        const newQuestions = Array.from({ length: settings.questionCount || 10 }).map(() =>
            generateQuestion(settings)
        );
        setQuestions(newQuestions);
        setQuestionStartTime(Date.now());
    }, [settings]);

    const handleNumberClick = (num: number) => {
        if (feedback !== 'none') return;
        if (activeBox === 'q') {
            setCurrentAnswer((prev) => (prev + num).slice(0, 4));
        } else {
            setCurrentRemainder((prev) => (prev + num).slice(0, 4));
        }
    };

    const handleBackspace = () => {
        if (feedback !== 'none') return;
        if (activeBox === 'q') {
            setCurrentAnswer((prev) => prev.slice(0, -1));
        } else {
            setCurrentRemainder((prev) => prev.slice(0, -1));
        }
    };

    const handleClear = () => {
        if (feedback !== 'none') return;
        setCurrentAnswer('');
        setCurrentRemainder('');
    };

    const handleSubmit = () => {
        if (!currentAnswer) return;
        const currentQ = questions[currentIndex];
        
        // For division, both quotient and remainder must be checked
        const isCorrectQ = parseInt(currentAnswer) === currentQ.correctAnswer;
        const isCorrectR = currentQ.correctRemainder !== undefined 
            ? parseInt(currentRemainder || '0') === currentQ.correctRemainder 
            : true;
        
        const isCorrect = isCorrectQ && isCorrectR;
        const answerTimeSec = (Date.now() - questionStartTime) / 1000;

        let qCoins = 0;
        if (isCorrect) {
            setFeedback('correct');
            audioService.playCorrect();
            setScore((s) => s + 1);

            let multiplier = 1.0;
            const { leftDigits, rightDigits, operations } = settings;
            if (leftDigits >= 2 || rightDigits >= 2) multiplier += 0.2;
            if (operations.some(op => op === '*' || op === '/')) multiplier += 0.5;
            if (operations.length > 1) multiplier += 0.3;

            let baseCoin = 10;
            if (answerTimeSec <= 5) baseCoin = 30;
            else if (answerTimeSec <= 10) baseCoin = 20;

            qCoins = Math.round(baseCoin * multiplier);
            setEarnedCoins(prev => prev + qCoins);
        } else {
            setFeedback('incorrect');
            audioService.playIncorrect();
        }

        setTimeout(() => {
            if (currentIndex < questions.length - 1) {
                setCurrentIndex((prev) => prev + 1);
                setCurrentAnswer('');
                setCurrentRemainder('');
                setActiveBox('q');
                setFeedback('none');
                setQuestionStartTime(Date.now());
            } else {
                finishGame(isCorrect ? score + 1 : score);
            }
        }, feedback === 'incorrect' ? 2000 : 1000); // Give more time to see correct answer if incorrect
    };

    const finishGame = (finalScore: number) => {
        setIsFinished(true);
        
        setEarnedCoins((prevCoins) => {
            let totalCoins = prevCoins;
            if (finalScore === (settings.questionCount || 10)) {
                totalCoins = Math.round(totalCoins * 1.2);
            }
            addCoins(totalCoins);
            return totalCoins;
        });

        const growthAmount = finalScore;
        useGameStore.getState().growPlants(growthAmount);
        audioService.playWin();
    };

    if (questions.length === 0) return <div>Loading...</div>;

    if (isFinished) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
                <div className="absolute top-10 left-[10%] text-white/60 text-6xl animate-pulse pointer-events-none">☁️</div>
                <div className="absolute top-32 right-[15%] text-white/50 text-5xl animate-pulse pointer-events-none" style={{ animationDelay: '1.5s' }}>☁️</div>

                <div className="bg-white/95 p-8 rounded-3xl shadow-2xl shadow-green-900/40 text-center max-w-md w-full border-[6px] border-[#d4a373] relative backdrop-blur-sm">
                    <h2 className="text-4xl font-bold text-green-800 mb-4 drop-shadow-sm">{t('practiceComplete', language)}</h2>
                    <p className="text-2xl text-amber-800 mb-2 font-bold">{t('correctCount', language)}: {score} / {questions.length}</p>
                    <p className="text-3xl font-black text-amber-600 mb-8">+ {earnedCoins} {t('coinsEarned', language)} 🪙</p>
                    <button
                        onClick={onBack}
                        className="w-full bg-green-500 hover:bg-green-400 text-white text-2xl font-black py-4 rounded-xl shadow-[0_8px_15px_rgba(34,197,94,0.3)] transform transition active:translate-y-2 border-b-8 border-green-700"
                    >
                        {t('backHome', language)}
                    </button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className={`min-h-screen flex flex-col p-4 transition-colors duration-500 font-sans relative overflow-hidden ${feedback === 'correct' ? 'bg-gradient-to-b from-green-300 to-green-500' : feedback === 'incorrect' ? 'bg-gradient-to-b from-red-200 to-red-400' : 'bg-gradient-to-b from-sky-300 via-sky-100 to-green-400'
            }`}>
            {/* Ambient decorative clouds */}
            {feedback === 'none' && (
                <>
                    <div className="absolute top-10 left-[10%] text-white/60 text-6xl animate-pulse pointer-events-none">☁️</div>
                    <div className="absolute top-32 right-[15%] text-white/50 text-5xl animate-pulse pointer-events-none" style={{ animationDelay: '1.5s' }}>☁️</div>
                </>
            )}

            {/* Header */}
            <div className="flex justify-between items-center mb-4 z-10">
                <button onClick={onBack} className="text-amber-900 hover:text-amber-700 transition font-bold text-lg bg-white/50 px-4 py-2 rounded-xl backdrop-blur-sm border-2 border-amber-900/10 shadow-sm">{t('exit', language)}</button>
                <div className="text-xl font-bold text-green-900 bg-white/50 px-4 py-2 rounded-xl backdrop-blur-sm border-2 border-green-900/10 shadow-sm">
                    {t('question', language)} {currentIndex + 1} / {questions.length}
                </div>
            </div>

            {/* Question Display */}
            <div className="flex-1 flex flex-col items-center justify-center mb-8 z-10">
                <div className="text-7xl font-black text-amber-900 tracking-wider mb-8 drop-shadow-md bg-white/60 px-8 py-4 rounded-3xl border-4 border-amber-900/20 backdrop-blur-sm shadow-xl">
                    {currentQ.leftOperand} {currentQ.operator === '*' ? '×' : currentQ.operator === '/' ? '÷' : currentQ.operator} {currentQ.rightOperand} = ?
                </div>
                
                {/* Dual Box for Division */}
                {currentQ.operator === '/' ? (
                    <div className="flex items-center gap-4">
                        <div 
                            onClick={() => feedback === 'none' && setActiveBox('q')}
                            className={`h-28 w-36 bg-[#2c3e50] rounded-2xl border-8 flex flex-col items-center justify-center text-5xl font-bold shadow-inner ${
                                feedback === 'incorrect' ? 'border-red-500 text-red-400' :
                                feedback === 'correct' ? 'border-green-400 text-green-300' :
                                activeBox === 'q' ? 'border-[#e6ccb2] text-white' : 'border-[#8b5a2b] text-[#dddddd]'
                            }`}>
                            <span className="text-xs text-neutral-400 uppercase tracking-widest">{t('quotient', language)}</span>
                            {feedback === 'incorrect' ? currentQ.correctAnswer : currentAnswer}
                        </div>
                        <div className="text-5xl font-black text-amber-900 drop-shadow-sm">...</div>
                        <div 
                            onClick={() => feedback === 'none' && setActiveBox('r')}
                            className={`h-28 w-36 bg-[#2c3e50] rounded-2xl border-8 flex flex-col items-center justify-center text-5xl font-bold shadow-inner ${
                                feedback === 'incorrect' ? 'border-red-500 text-red-400' :
                                feedback === 'correct' ? 'border-green-400 text-green-300' :
                                activeBox === 'r' ? 'border-[#e6ccb2] text-white' : 'border-[#8b5a2b] text-[#dddddd]'
                            }`}>
                            <span className="text-xs text-neutral-400 uppercase tracking-widest">{t('remainder', language)}</span>
                            {feedback === 'incorrect' ? (currentQ.correctRemainder ?? 0) : currentRemainder}
                        </div>
                    </div>
                ) : (
                    <div className={`h-28 w-full max-w-xs bg-[#2c3e50] rounded-2xl border-8 flex items-center justify-center text-6xl font-bold shadow-inner ${
                        feedback === 'correct' ? 'border-green-400 text-green-300' :
                        feedback === 'incorrect' ? 'border-red-500 text-red-400' : 'border-[#8b5a2b] text-white'
                        }`}>
                        {feedback === 'incorrect' ? currentQ.correctAnswer : currentAnswer}
                    </div>
                )}

                {/* Feedback Message */}
                {feedback === 'correct' && (
                    <div className="mt-6 text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] animate-bounce">{t('correct', language)}</div>
                )}
                {feedback === 'incorrect' && (
                    <div className="mt-6 text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] animate-shake">{t('incorrect', language)}</div>
                )}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto w-full z-10">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        onClick={() => handleNumberClick(num)}
                        className="bg-[#d4a373] text-white border-b-[6px] border-[#bc8a5f] text-4xl font-black py-4 rounded-2xl shadow-md active:translate-y-1 active:border-b-0 transition"
                    >
                        {num}
                    </button>
                ))}
                
                {currentQ.operator === '/' ? (
                    <button 
                        onClick={() => setActiveBox(activeBox === 'q' ? 'r' : 'q')}
                        className={`border-b-[6px] text-2xl font-black py-4 rounded-2xl shadow-md transition active:translate-y-1 active:border-b-0 ${
                            activeBox === 'q' ? 'bg-[#e6ccb2] border-[#d4a373] text-amber-900' : 'bg-[#bc8a5f] border-[#9c6644] text-white'
                        }`}
                    >
                        {t('remainder', language).charAt(0)}
                    </button>
                ) : (
                    <button onClick={handleClear} className="bg-red-400 text-white border-b-[6px] border-red-600 text-2xl font-black py-4 rounded-2xl shadow-md transition active:translate-y-1 active:border-b-0">C</button>
                )}
                
                <button onClick={() => handleNumberClick(0)} className="bg-[#d4a373] text-white border-b-[6px] border-[#bc8a5f] text-4xl font-black py-4 rounded-2xl shadow-md active:translate-y-1 active:border-b-0 transition">0</button>
                <button onClick={handleBackspace} className="bg-[#e6ccb2] text-amber-900 border-b-[6px] border-[#d4a373] text-3xl font-black py-4 rounded-2xl shadow-md transition active:translate-y-1 active:border-b-0">⌫</button>
            </div>

            {/* Submit Button */}
            <div className="max-w-sm mx-auto w-full mt-6 z-10">
                <button
                    onClick={handleSubmit}
                    disabled={!currentAnswer || feedback !== 'none'}
                    className="w-full bg-green-500 disabled:bg-green-200 disabled:border-green-300 text-white border-b-[8px] border-green-700 text-4xl font-black py-4 rounded-2xl shadow-[0_8px_15px_rgba(34,197,94,0.3)] disabled:shadow-none transform transition active:translate-y-2 active:border-b-0"
                >
                    ✅
                </button>
            </div>
        </div>
    );
};
