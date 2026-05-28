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
        <div className="min-h-screen bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
            {/* Ambient decorative clouds */}
            <div className="absolute top-10 left-[10%] text-white/60 text-6xl animate-pulse pointer-events-none">☁️</div>
            <div className="absolute top-32 right-[15%] text-white/50 text-5xl animate-pulse pointer-events-none" style={{ animationDelay: '1.5s' }}>☁️</div>

            <div className="bg-white/95 rounded-3xl shadow-2xl shadow-green-900/40 w-full max-w-lg border-[6px] border-[#d4a373] overflow-hidden relative backdrop-blur-sm">

                {/* Header & Language Switch */}
                <div className="bg-[#fefae0] p-6 flex flex-col gap-4 border-b-[6px] border-[#d4a373]">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-black text-green-800 tracking-wide drop-shadow-sm">
                            {t('appTitle', language)}
                        </h1>
                        <button
                            onClick={() => setLanguage(language === 'zh-TW' ? 'en' : 'zh-TW')}
                            className="bg-green-100 hover:bg-green-200 text-green-800 font-bold py-1 px-3 rounded-full text-xs transition border border-green-300 shadow-sm"
                        >
                            {language === 'zh-TW' ? 'English' : '中文'}
                        </button>
                    </div>

                    {/* Stats Bar */}
                    {currentUserId && users[currentUserId] && (
                        <div className="flex gap-2 justify-between bg-green-50 p-2 rounded-xl border border-green-200">
                            <div className="flex gap-2">
                                <button
                                    onClick={onSpace}
                                    className="bg-[#d4a373] hover:brightness-110 text-white font-bold py-2 px-4 rounded-lg text-sm transition shadow-sm border-2 border-[#bc8a5f] flex items-center gap-2 transform active:scale-95"
                                >
                                    <span>🚜</span>
                                    <span>{language === 'zh-TW' ? '我的農場' : 'My Farm'}</span>
                                </button>
                                <button
                                    onClick={onShop}
                                    className="bg-[#d4a373] hover:brightness-110 text-white font-bold py-2 px-4 rounded-lg text-sm transition shadow-sm border-2 border-[#bc8a5f] flex items-center gap-2 transform active:scale-95"
                                >
                                    <span>🏪</span>
                                    <span>{language === 'zh-TW' ? '商店' : 'Shop'}</span>
                                </button>
                            </div>
                            <div className="bg-white px-3 py-1 rounded-lg flex items-center gap-2 text-green-800 font-mono font-bold border-2 border-green-200 shadow-sm">
                                <span>🪙</span>
                                <span className="text-xl">{users[currentUserId].coins}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-8">

                    {/* User Selection */}
                    <div className="space-y-3">
                        <label className="block text-lg font-bold text-amber-900">{t('whoIsPlaying', language)}</label>
                        <div className="flex flex-wrap gap-3">
                            {Object.values(users).map((user) => (
                                <button
                                    key={user.id}
                                    onClick={() => switchUser(user.id)}
                                     className={`px-4 py-2 rounded-xl text-lg font-bold transition-all transform active:scale-95 ${currentUserId === user.id
                                        ? 'bg-green-500 text-white border-b-4 border-green-700 shadow-md'
                                        : 'bg-green-100 text-green-800 border-b-4 border-green-200 hover:bg-green-200 hover:border-green-300'
                                        }`}
                                >
                                    {user.name} <span className="text-green-700/70 ml-1 text-sm">🪙 {user.coins}</span>
                                </button>
                            ))}
                            <button
                                onClick={() => setIsCreatingUser(true)}
                                className="px-4 py-2 rounded-xl text-lg font-bold bg-[#fefae0] text-amber-700 border-2 border-dashed border-amber-300 hover:bg-amber-50 transition"
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
                                    className="flex-1 px-4 py-2 bg-white border-2 border-green-300 text-green-900 placeholder-green-300 rounded-xl focus:outline-none focus:border-green-500 text-lg shadow-inner"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    className="bg-green-500 text-white px-6 py-2 rounded-xl font-bold border-b-4 border-green-700 hover:bg-green-400 hover:border-green-600 transition active:border-b-0 active:translate-y-1"
                                >
                                    {t('add', language)}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Operation Settings */}
                    <div className="space-y-3">
                        <label className="block text-lg font-bold text-amber-900">{t('operations', language)}</label>
                        <div className="grid grid-cols-4 gap-3">
                            {(['+', '-', '*', '/'] as const).map((op) => (
                                <button
                                    key={op}
                                    onClick={() => handleOperationToggle(op)}
                                    className={`h-16 rounded-2xl text-4xl font-black transition-all active:scale-95 ${settings.operations.includes(op)
                                        ? 'bg-[#d4a373] text-white border-b-[6px] border-[#bc8a5f] transform -translate-y-1 shadow-md'
                                        : 'bg-[#fefae0] text-amber-700/50 border-b-4 border-amber-200 hover:bg-amber-100 hover:text-amber-700/80'
                                        }`}
                                >
                                    {op === '*' ? '×' : op === '/' ? '÷' : op}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Digit Settings - Vertical Stack */}
                    <div className="space-y-4">
                        <div className="bg-green-50/50 p-4 rounded-2xl border-2 border-green-100">
                            <label className="block text-md font-bold text-green-700 mb-2 uppercase tracking-wider">{t('leftDigits', language)}</label>
                            <div className="flex gap-2">
                                {[1, 2, 3].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => updateSettings({ leftDigits: d })}
                                        className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${settings.leftDigits === d
                                            ? 'bg-green-500 text-white border-b-4 border-green-700 shadow-md'
                                            : 'bg-white text-green-600 border-b-4 border-green-200 hover:bg-green-50'
                                            }`}
                                    >
                                        {d === 1 ? t('digits1', language) : d === 2 ? t('digits2', language) : t('digits3', language)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-green-50/50 p-4 rounded-2xl border-2 border-green-100">
                            <label className="block text-md font-bold text-green-700 mb-2 uppercase tracking-wider">{t('rightDigits', language)}</label>
                            <div className="flex gap-2">
                                {[1, 2, 3].map((d) => (
                                    <button
                                        key={d}
                                        onClick={() => updateSettings({ rightDigits: d })}
                                        className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${settings.rightDigits === d
                                            ? 'bg-green-500 text-white border-b-4 border-green-700 shadow-md'
                                            : 'bg-white text-green-600 border-b-4 border-green-200 hover:bg-green-50'
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
                        <label className="block text-lg font-bold text-amber-900">{t('questionCount', language)}</label>
                        <div className="flex gap-3 items-stretch">
                            {[10, 20].map((count) => (
                                <button
                                    key={count}
                                    onClick={() => updateSettings({ questionCount: count })}
                                    className={`flex-1 py-2 rounded-xl font-bold text-lg transition-all ${(settings.questionCount || 10) === count
                                        ? 'bg-green-500 text-white border-b-4 border-green-700 shadow-md'
                                        : 'bg-white text-green-600 border-b-4 border-green-200 hover:bg-green-50'
                                        }`}
                                >
                                    {count} {t('questions', language)}
                                </button>
                            ))}
                            <div className={`flex-1 flex items-center rounded-xl overflow-hidden transition-all border-b-4 ${(![10, 20].includes(settings.questionCount || 10)) 
                                ? 'bg-green-500 text-white border-green-700 shadow-md' 
                                : 'bg-white border-green-200 focus-within:border-green-400'}`}>
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
                                    className={`w-full bg-transparent text-center font-bold text-lg py-2 outline-none ${(![10, 20].includes(settings.questionCount || 10)) ? 'text-white placeholder-green-200' : 'text-green-800 placeholder-green-300'}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        className="w-full bg-green-500 hover:bg-green-400 text-white text-2xl font-black py-5 rounded-2xl shadow-[0_10px_20px_rgba(34,197,94,0.3)] transform transition active:translate-y-2 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed mt-4 border-b-8 border-green-700"
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
