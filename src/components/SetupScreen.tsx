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
        <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4 font-sans">
            <div className="bg-neutral-800 rounded-3xl shadow-2xl shadow-black/40 w-full max-w-lg border border-neutral-700 overflow-hidden relative">

                {/* Header & Language Switch */}
                <div className="bg-neutral-950 p-6 flex flex-col gap-4 border-b border-neutral-800">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-black text-neutral-100 tracking-wide drop-shadow-md">
                            {t('appTitle', language)}
                        </h1>
                        <button
                            onClick={() => setLanguage(language === 'zh-TW' ? 'en' : 'zh-TW')}
                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold py-1 px-3 rounded-full text-xs transition border border-neutral-600"
                        >
                            {language === 'zh-TW' ? 'English' : '中文'}
                        </button>
                    </div>

                    {/* Stats Bar */}
                    {currentUserId && users[currentUserId] && (
                        <div className="flex gap-2 justify-between bg-neutral-900 p-2 rounded-xl border border-neutral-700/50">
                            <div className="flex gap-2">
                                <button
                                    onClick={onSpace}
                                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold py-2 px-4 rounded-lg text-sm transition shadow-sm border border-neutral-700 flex items-center gap-2 transform active:scale-95"
                                >
                                    <span>🧱</span>
                                    <span>{language === 'zh-TW' ? '我的世界' : 'My World'}</span>
                                </button>
                                <button
                                    onClick={onShop}
                                    className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold py-2 px-4 rounded-lg text-sm transition shadow-sm border border-neutral-700 flex items-center gap-2 transform active:scale-95"
                                >
                                    <span>🏪</span>
                                    <span>{language === 'zh-TW' ? '積木商店' : 'Block Shop'}</span>
                                </button>
                            </div>
                            <div className="bg-neutral-800 px-3 py-1 rounded-lg flex items-center gap-2 text-neutral-200 font-mono font-bold border border-neutral-700">
                                <span>🪙</span>
                                <span className="text-neutral-100 text-lg">{users[currentUserId].coins}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-8">

                    {/* User Selection */}
                    <div className="space-y-3">
                        <label className="block text-lg font-bold text-neutral-300">{t('whoIsPlaying', language)}</label>
                        <div className="flex flex-wrap gap-3">
                            {Object.values(users).map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => switchUser(user.id)}
                                     className={`px-4 py-2 rounded-xl text-lg font-bold transition-all transform active:scale-95 ${currentUserId === user.id
                                        ? 'bg-neutral-200 text-neutral-900 border-2 border-neutral-300 shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                                        : 'bg-neutral-700 text-neutral-400 border-2 border-transparent hover:bg-neutral-600'
                                        }`}
                                >
                                    {user.name} <span className="text-neutral-500 ml-1">🪙 {user.coins}</span>
                                </button>
                            ))}
                            <button
                                onClick={() => setIsCreatingUser(true)}
                                className="px-4 py-2 rounded-xl text-lg font-bold bg-neutral-800 text-neutral-500 border-2 border-dashed border-neutral-600 hover:bg-neutral-700 hover:border-neutral-500 hover:text-neutral-300 transition"
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
                                    className="flex-1 px-4 py-2 bg-neutral-700 border-2 border-neutral-600 text-neutral-200 placeholder-neutral-500 rounded-xl focus:outline-none focus:border-neutral-400 text-lg shadow-inner"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="bg-neutral-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-neutral-500 transition"
                                >
                                    {t('add', language)}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Operation Settings */}
                    <div className="space-y-3">
                        <label className="block text-lg font-bold text-neutral-300">{t('operations', language)}</label>
                        <div className="grid grid-cols-4 gap-3">
                            {(['+', '-', '*', '/'] as const).map((op) => (
                                <button
                                    key={op}
                                    onClick={() => handleOperationToggle(op)}
                                    className={`h-16 rounded-2xl text-4xl font-black shadow-sm transition-all active:scale-95 ${settings.operations.includes(op)
                                        ? 'bg-neutral-200 text-neutral-900 transform -translate-y-1 shadow-[0_4px_10px_rgba(0,0,0,0.3)] border border-neutral-300'
                                        : 'bg-neutral-800 text-neutral-600 border border-neutral-700 hover:bg-neutral-700'
                                        }`}
                                >
                                    {op === '*' ? '×' : op === '/' ? '÷' : op}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Digit Settings - Vertical Stack */}
                    <div className="space-y-4">
                        <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700">
                            <label className="block text-md font-bold text-neutral-400 mb-2 uppercase tracking-wider">{t('leftDigits', language)}</label>
                            <div className="flex gap-2">
                                {[1, 2, 3].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => updateSettings({ leftDigits: d })}
                                        className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${settings.leftDigits === d
                                            ? 'bg-neutral-200 text-neutral-900 shadow-[0_4px_10px_rgba(0,0,0,0.3)] border border-neutral-300'
                                            : 'bg-neutral-800 text-neutral-600 border border-neutral-700 hover:bg-neutral-700'
                                            }`}
                                    >
                                        {d === 1 ? t('digits1', language) : d === 2 ? t('digits2', language) : t('digits3', language)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-neutral-800/50 p-4 rounded-2xl border border-neutral-700">
                            <label className="block text-md font-bold text-neutral-400 mb-2 uppercase tracking-wider">{t('rightDigits', language)}</label>
                            <div className="flex gap-2">
                                {[1, 2, 3].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => updateSettings({ rightDigits: d })}
                                        className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${settings.rightDigits === d
                                            ? 'bg-neutral-200 text-neutral-900 shadow-[0_4px_10px_rgba(0,0,0,0.3)] border border-neutral-300'
                                            : 'bg-neutral-800 text-neutral-600 border border-neutral-700 hover:bg-neutral-700'
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
                        <label className="block text-lg font-bold text-neutral-300">{t('questionCount', language)}</label>
                        <div className="flex gap-3 items-stretch">
                            {[10, 20].map((count) => (
                                <button
                                    key={count}
                                    onClick={() => updateSettings({ questionCount: count })}
                                    className={`flex-1 py-2 rounded-xl font-bold text-lg transition-all ${(settings.questionCount || 10) === count
                                        ? 'bg-neutral-200 text-neutral-900 shadow-[0_4px_10px_rgba(0,0,0,0.3)] border border-neutral-300'
                                        : 'bg-neutral-800 text-neutral-600 border border-neutral-700 hover:bg-neutral-700'
                                        }`}
                                >
                                    {count} {t('questions', language)}
                                </button>
                            ))}
                            <div className={`flex-1 flex items-center rounded-xl overflow-hidden transition-all ${(![10, 20].includes(settings.questionCount || 10)) 
                                ? 'bg-neutral-200 text-neutral-900 shadow-[0_4px_10px_rgba(0,0,0,0.3)] border border-neutral-300' 
                                : 'bg-neutral-800 border border-neutral-700 focus-within:border-neutral-500'}`}>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="999"
                                    value={(![10, 20].includes(settings.questionCount || 10)) ? settings.questionCount : ''}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val) && val > 0) updateSettings({ questionCount: val });
                                    }}
                                    placeholder={language === 'zh-TW' ? '自訂...' : 'Custom'}
                                    className={`w-full bg-transparent text-center font-bold text-lg py-2 outline-none ${(![10, 20].includes(settings.questionCount || 10)) ? 'text-neutral-900 placeholder-neutral-500' : 'text-neutral-200 placeholder-neutral-600'}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        className="w-full bg-neutral-200 hover:bg-white text-neutral-900 text-2xl font-black py-5 rounded-2xl shadow-xl shadow-black/20 transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4 border border-neutral-400 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
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
