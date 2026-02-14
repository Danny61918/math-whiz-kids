import React, { useState } from 'react';
import { useGameStore, type GameSettings } from '../store/useGameStore';
import { t } from '../utils/i18n';

export const SetupScreen: React.FC<{ onStart: () => void; onShop: () => void; onSpace: () => void }> = ({ onStart, onShop, onSpace }) => {
    const { users, currentUserId, settings, createUser, switchUser, updateSettings, language, setLanguage } = useGameStore();
    const [newUserName, setNewUserName] = useState('');
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (newUserName.trim()) {
            createUser(newUserName, 'default-avatar');
            setNewUserName('');
            setIsCreatingUser(false);
        }
    };

    const handleOperationToggle = (op: GameSettings['operations'][number]) => {
        const currentOps = settings.operations;
        let newOps: GameSettings['operations'];
        if (currentOps.includes(op)) {
            newOps = currentOps.filter((o) => o !== op);
        } else {
            newOps = [...currentOps, op];
        }
        if (newOps.length === 0) return;
        updateSettings({ operations: newOps });
    };

    const startButtonText = settings.operations.length > 1 ? t('startMixedPractice', language) : t('startPractice', language);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg border-2 border-slate-100 overflow-hidden relative">

                {/* Header & Language Switch */}
                <div className="bg-purple-600 p-6 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-black text-white tracking-wide drop-shadow-md">
                            {t('appTitle', language)}
                        </h1>
                        <button
                            onClick={() => setLanguage(language === 'zh-TW' ? 'en' : 'zh-TW')}
                            className="bg-white/20 hover:bg-white/30 text-white font-bold py-1 px-3 rounded-full text-xs transition border border-white/30"
                        >
                            {language === 'zh-TW' ? 'English' : '中文'}
                        </button>
                    </div>

                    {/* Stats Bar */}
                    {currentUserId && users[currentUserId] && (
                        <div className="flex gap-2 justify-between bg-purple-700/50 p-2 rounded-xl border border-white/10">
                            <div className="flex gap-2">
                                <button
                                    onClick={onSpace}
                                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition shadow-md flex items-center gap-2 transform active:scale-95"
                                >
                                    <span>🏡</span>
                                    <span>{t('myFarm', language)}</span>
                                    <span className="bg-green-700 px-1.5 rounded text-[10px]">Lv.{users[currentUserId].landLevel || 1}</span>
                                </button>
                                <button
                                    onClick={onShop}
                                    className="bg-yellow-400 hover:bg-yellow-500 text-purple-900 font-bold py-2 px-4 rounded-lg text-sm transition shadow-md flex items-center gap-2 transform active:scale-95"
                                >
                                    <span>🛍️</span>
                                    <span>{t('shop', language)}</span>
                                </button>
                            </div>
                            <div className="bg-purple-900/40 px-3 py-1 rounded-lg flex items-center gap-2 text-white font-mono font-bold border border-white/10">
                                <span>🪙</span>
                                <span className="text-yellow-300 text-lg">{users[currentUserId].coins}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-8">

                    {/* User Selection */}
                    <div className="space-y-3">
                        <label className="block text-lg font-bold text-slate-700">{t('whoIsPlaying', language)}</label>
                        <div className="flex flex-wrap gap-3">
                            {Object.values(users).map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => switchUser(user.id)}
                                    className={`px-4 py-2 rounded-xl text-lg font-bold transition-all transform active:scale-95 ${currentUserId === user.id
                                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-500 shadow-sm'
                                        : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                                        }`}
                                >
                                    {user.name} <span className="text-yellow-500 ml-1">🪙 {user.coins}</span>
                                </button>
                            ))}
                            <button
                                onClick={() => setIsCreatingUser(true)}
                                className="px-4 py-2 rounded-xl text-lg font-bold bg-slate-100 text-slate-500 border-2 border-dashed border-slate-300 hover:bg-slate-200 hover:border-slate-400 transition"
                            >
                                {t('addNewPlayer', language)}
                            </button>
                        </div>
                        {isCreatingUser && (
                            <form onSubmit={handleCreateUser} className="flex gap-2 mt-2">
                                <input
                                    type="text"
                                    value={newUserName}
                                    onChange={(e) => setNewUserName(e.target.value)}
                                    placeholder={t('name', language)}
                                    className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-purple-500 text-lg"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-purple-700 transition"
                                >
                                    {t('add', language)}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Operation Settings */}
                    <div className="space-y-3">
                        <label className="block text-lg font-bold text-slate-700">{t('operations', language)}</label>
                        <div className="grid grid-cols-4 gap-3">
                            {(['+', '-', '*', '/'] as const).map((op) => (
                                <button
                                    key={op}
                                    onClick={() => handleOperationToggle(op)}
                                    className={`h-16 rounded-2xl text-4xl font-black shadow-sm transition-all active:scale-95 ${settings.operations.includes(op)
                                        ? 'bg-blue-500 text-white transform -translate-y-1 shadow-blue-200'
                                        : 'bg-slate-100 text-slate-300'
                                        }`}
                                >
                                    {op === '*' ? '×' : op === '/' ? '÷' : op}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Digit Settings - Vertical Stack */}
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <label className="block text-md font-bold text-slate-500 mb-2 uppercase tracking-wider">{t('leftDigits', language)}</label>
                            <div className="flex gap-2">
                                {[1, 2, 3].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => updateSettings({ leftDigits: d })}
                                        className={`flex-1 py-3 rounded-xl font-bold text-lg transition-colors ${settings.leftDigits === d
                                            ? 'bg-indigo-500 text-white shadow-md'
                                            : 'bg-white text-slate-400 border border-slate-200'
                                            }`}
                                    >
                                        {d === 1 ? t('digits1', language) : d === 2 ? t('digits2', language) : t('digits3', language)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <label className="block text-md font-bold text-slate-500 mb-2 uppercase tracking-wider">{t('rightDigits', language)}</label>
                            <div className="flex gap-2">
                                {[1, 2, 3].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => updateSettings({ rightDigits: d })}
                                        className={`flex-1 py-3 rounded-xl font-bold text-lg transition-colors ${settings.rightDigits === d
                                            ? 'bg-pink-500 text-white shadow-md'
                                            : 'bg-white text-slate-400 border border-slate-200'
                                            }`}
                                    >
                                        {d === 1 ? t('digits1', language) : d === 2 ? t('digits2', language) : t('digits3', language)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Question Count Settings */}
                    <div className="space-y-3">
                        <label className="block text-lg font-bold text-slate-700">{t('questionCount', language)}</label>
                        <div className="flex gap-3">
                            {[5, 10, 20].map((count) => (
                                <button
                                    key={count}
                                    onClick={() => updateSettings({ questionCount: count })}
                                    className={`flex-1 py-2 rounded-xl font-bold text-lg transition-colors ${(settings.questionCount || 10) === count
                                        ? 'bg-orange-500 text-white shadow-md'
                                        : 'bg-orange-50 text-orange-300'
                                        }`}
                                >
                                    {count} {t('questions', language)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        className="w-full bg-green-500 hover:bg-green-600 text-white text-2xl font-black py-5 rounded-2xl shadow-xl shadow-green-200 transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                        disabled={!currentUserId}
                        onClick={onStart}
                    >
                        {startButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};
