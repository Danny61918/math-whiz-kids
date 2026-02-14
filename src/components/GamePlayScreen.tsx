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
    const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [earnedCoins, setEarnedCoins] = useState(0);

    useEffect(() => {
        // Generate questions on mount
        const newQuestions = Array.from({ length: settings.questionCount || 10 }).map(() =>
            generateQuestion(settings)
        );
        setQuestions(newQuestions);
    }, [settings]);

    const handleNumberClick = (num: number) => {
        if (feedback !== 'none') return;
        setCurrentAnswer((prev) => (prev + num).slice(0, 4)); // Max 4 digits
    };

    const handleBackspace = () => {
        if (feedback !== 'none') return;
        setCurrentAnswer((prev) => prev.slice(0, -1));
    };

    const handleClear = () => {
        if (feedback !== 'none') return;
        setCurrentAnswer('');
    };

    const calculateReward = (correctCount: number) => {
        let multiplier = 1.0;
        const { leftDigits, rightDigits, operations } = settings;

        // Digits multiplier
        if (leftDigits >= 2 || rightDigits >= 2) multiplier += 0.2;

        // Operation multiplier
        if (operations.some(op => op === '*' || op === '/')) multiplier += 0.5;
        if (operations.length > 1) multiplier += 0.3; // Mixed operations

        // Perfect score bonus
        if (correctCount === (settings.questionCount || 10)) multiplier *= 1.2;

        const baseReward = 10 * correctCount;
        return Math.round(baseReward * multiplier);
    };

    const handleSubmit = () => {
        if (!currentAnswer) return;

        const currentQ = questions[currentIndex];
        const isCorrect = parseInt(currentAnswer) === currentQ.correctAnswer;

        if (isCorrect) {
            setFeedback('correct');
            audioService.playCorrect();
            setScore((s) => s + 1);
        } else {
            setFeedback('incorrect');
            audioService.playIncorrect();
        }

        setTimeout(() => {
            if (currentIndex < questions.length - 1) {
                setCurrentIndex((prev) => prev + 1);
                setCurrentAnswer('');
                setFeedback('none');
            } else {
                finishGame(isCorrect ? score + 1 : score);
            }
        }, 1000);
    };

    const finishGame = (finalScore: number) => {
        setIsFinished(true);
        const coins = calculateReward(finalScore);
        setEarnedCoins(coins);
        addCoins(coins);

        // Farm Growth Logic
        // Base growth on score (e.g., 1 XP per correct answer)
        // You could also add bonuses for perfect scores
        const growthAmount = finalScore;
        useGameStore.getState().growPlants(growthAmount);

        audioService.playWin();
    };

    if (questions.length === 0) return <div>Loading...</div>;

    if (isFinished) {
        return (
            <div className="min-h-screen bg-green-100 flex flex-col items-center justify-center p-4 font-sans">
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full border-4 border-green-400">
                    <h2 className="text-4xl font-bold text-purple-600 mb-4">{t('practiceComplete', language)}</h2>
                    <p className="text-2xl text-gray-700 mb-2">{t('correctCount', language)}: {score} / {questions.length}</p>
                    <p className="text-3xl font-black text-yellow-500 mb-8">+ {earnedCoins} {t('coinsEarned', language)} 🪙</p>
                    <button
                        onClick={onBack}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white text-2xl font-bold py-3 rounded-xl shadow-lg"
                    >
                        {t('backHome', language)}
                    </button>
                </div>
            </div>
        );
    }

    const currentQ = questions[currentIndex];

    return (
        <div className={`min-h-screen flex flex-col p-4 transition-colors duration-500 font-sans ${feedback === 'correct' ? 'bg-green-200' : feedback === 'incorrect' ? 'bg-red-200' : 'bg-blue-50'
            }`}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <button onClick={onBack} className="text-gray-500 font-bold text-lg">{t('exit', language)}</button>
                <div className="text-xl font-bold text-blue-600">
                    {t('question', language)} {currentIndex + 1} / {questions.length}
                </div>
            </div>

            {/* Question Display */}
            <div className="flex-1 flex flex-col items-center justify-center mb-8">
                <div className="text-6xl font-black text-gray-800 tracking-wider mb-8">
                    {currentQ.leftOperand} {currentQ.operator === '*' ? '×' : currentQ.operator === '/' ? '÷' : currentQ.operator} {currentQ.rightOperand} = ?
                </div>
                <div className={`h-24 w-full max-w-xs bg-white rounded-2xl border-4 flex items-center justify-center text-5xl font-bold shadow-inner ${feedback === 'correct' ? 'border-green-500 text-green-600' :
                    feedback === 'incorrect' ? 'border-red-500 text-red-600' : 'border-gray-300 text-gray-800'
                    }`}>
                    {feedback === 'incorrect' ? currentQ.correctAnswer : currentAnswer}
                </div>

                {/* Feedback Message */}
                {feedback === 'correct' && (
                    <div className="mt-4 text-4xl font-black text-green-600 animate-bounce">{t('correct', language)}</div>
                )}
                {feedback === 'incorrect' && (
                    <div className="mt-4 text-4xl font-black text-red-600 animate-shake">{t('incorrect', language)}</div>
                )}
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto w-full">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        onClick={() => handleNumberClick(num)}
                        className="bg-white hover:bg-blue-50 text-blue-600 text-3xl font-bold py-4 rounded-xl shadow-md active:scale-95 transition"
                    >
                        {num}
                    </button>
                ))}
                <button onClick={handleClear} className="bg-red-100 hover:bg-red-200 text-red-500 text-xl font-bold py-4 rounded-xl shadow-md">C</button>
                <button onClick={() => handleNumberClick(0)} className="bg-white hover:bg-blue-50 text-blue-600 text-3xl font-bold py-4 rounded-xl shadow-md">0</button>
                <button onClick={handleBackspace} className="bg-orange-100 hover:bg-orange-200 text-orange-500 text-xl font-bold py-4 rounded-xl shadow-md">⌫</button>
            </div>

            {/* Submit Button */}
            <div className="max-w-sm mx-auto w-full mt-4">
                <button
                    onClick={handleSubmit}
                    disabled={!currentAnswer || feedback !== 'none'}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white text-3xl font-black py-4 rounded-xl shadow-lg transform transition active:scale-95"
                >
                    ✅
                </button>
            </div>
        </div>
    );
};
