import React, { useState } from 'react';
import { useGameStore, useCurrentUser, useLanguage, type Language, type UserMode } from '../store/useGameStore';
import { t } from '../utils/i18n';

const AVATARS = ['🦊', '🐱', '🐶', '🐼', '🦁', '🐸', '🐰', '🐯'];

const defaultLanguage = (mode: UserMode): Language => (mode === 'kinder' ? 'en' : 'zh-TW');

interface Props {
    onStart: () => void;
}

export const SetupScreen: React.FC<Props> = ({ onStart }) => {
    const users = useGameStore((s) => s.users);
    const createUser = useGameStore((s) => s.createUser);
    const switchUser = useGameStore((s) => s.switchUser);
    const setUserLanguage = useGameStore((s) => s.setUserLanguage);
    const setUserMode = useGameStore((s) => s.setUserMode);
    const currentUser = useCurrentUser();
    const language = useLanguage();

    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState(AVATARS[0]);
    const [mode, setMode] = useState<UserMode>('kinder');
    const [languageChoice, setLanguageChoice] = useState<Language | null>(null);
    const newLanguage = languageChoice ?? defaultLanguage(mode);

    const handleCreate = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        createUser(trimmed, avatar, mode, newLanguage);
        setName('');
        setLanguageChoice(null);
        setIsCreating(false);
    };

    const choiceClass = (selected: boolean) =>
        `flex-1 min-h-16 rounded-2xl text-xl font-black border-b-4 transition active:translate-y-1 ${
            selected ? 'bg-green-700 text-white border-green-900' : 'bg-white text-amber-950 border-amber-400'
        }`;

    const userList = Object.values(users);

    return (
        <div className="min-h-dvh bg-gradient-to-b from-sky-300 via-sky-100 to-green-400 flex flex-col items-center p-4 font-sans">
            <div className="bg-white/95 p-6 rounded-3xl shadow-2xl text-center max-w-[520px] w-full border-[6px] border-[#d4a373] mt-6">
                <h1 className="text-4xl font-black text-green-900 mb-6">{t('appTitle', language)}</h1>

                <h2 className="text-xl font-bold text-amber-950 mb-3">{t('whoIsPlaying', language)}</h2>
                <div className="flex flex-col gap-3 mb-4">
                    {userList.map((u) => (
                        <button
                            key={u.id}
                            onClick={() => switchUser(u.id)}
                            className={`flex items-center gap-3 min-h-16 px-4 rounded-2xl border-4 text-left transition ${
                                currentUser?.id === u.id
                                    ? 'bg-green-100 border-green-500'
                                    : 'bg-amber-50 border-amber-200 hover:border-amber-400'
                            }`}
                        >
                            <span className="text-4xl">{u.avatar}</span>
                            <span className="flex-1">
                                <span className="block text-xl font-black text-amber-900">{u.name}</span>
                                <span className="block text-base font-bold text-green-800">
                                    {t(u.mode === 'kinder' ? 'modeKinder' : 'modeGrade4', language)}
                                </span>
                            </span>
                            <span className="text-lg font-black text-amber-800">🪙 {u.coins}</span>
                        </button>
                    ))}
                </div>

                {isCreating ? (
                    <div className="flex flex-col gap-3 bg-amber-50 p-4 rounded-2xl border-2 border-amber-200 mb-4">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('name', language)}
                            maxLength={12}
                            className="w-full min-h-14 px-4 rounded-xl border-2 border-amber-300 text-xl text-amber-900"
                        />
                        <div className="flex flex-wrap justify-center gap-2">
                            {AVATARS.map((a) => (
                                <button
                                    key={a}
                                    onClick={() => setAvatar(a)}
                                    className={`text-3xl w-14 h-14 rounded-xl border-4 ${
                                        avatar === a ? 'border-green-500 bg-green-100' : 'border-transparent'
                                    }`}
                                >
                                    {a}
                                </button>
                            ))}
                        </div>
                        <div>
                            <div className="text-base font-bold text-amber-950 mb-1">{t('mode', language)}</div>
                            <div className="flex gap-2">
                                <button onClick={() => setMode('kinder')} className={choiceClass(mode === 'kinder')}>
                                    {t('modeKinder', language)}
                                </button>
                                <button onClick={() => setMode('grade4')} className={choiceClass(mode === 'grade4')}>
                                    {t('modeGrade4', language)}
                                </button>
                            </div>
                        </div>
                        <div>
                            <div className="text-base font-bold text-amber-950 mb-1">{t('language', language)}</div>
                            <div className="flex gap-2">
                                <button onClick={() => setLanguageChoice('zh-TW')} className={choiceClass(newLanguage === 'zh-TW')}>
                                    {t('langZhTW', language)}
                                </button>
                                <button onClick={() => setLanguageChoice('en')} className={choiceClass(newLanguage === 'en')}>
                                    {t('langEn', language)}
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsCreating(false)}
                                className="flex-1 min-h-14 rounded-xl bg-neutral-200 text-neutral-900 text-lg font-bold"
                            >
                                {t('cancel', language)}
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!name.trim()}
                                className="flex-1 min-h-14 rounded-xl bg-green-700 disabled:bg-slate-300 disabled:text-slate-700 text-white text-lg font-black"
                            >
                                {t('add', language)}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="w-full min-h-14 mb-4 rounded-2xl border-4 border-dashed border-amber-400 text-amber-900 text-lg font-bold hover:bg-amber-50"
                    >
                        {t('addNewPlayer', language)}
                    </button>
                )}

                {currentUser && (
                    <div className="mb-4">
                        <div className="text-base font-bold text-amber-950 mb-1">{t('mode', language)}</div>
                        <div className="flex gap-2 mb-3">
                            <button onClick={() => setUserMode('kinder')} className={choiceClass(currentUser.mode === 'kinder')}>
                                {t('modeKinder', language)}
                            </button>
                            <button onClick={() => setUserMode('grade4')} className={choiceClass(currentUser.mode === 'grade4')}>
                                {t('modeGrade4', language)}
                            </button>
                        </div>
                        <div className="text-base font-bold text-amber-950 mb-1">{t('language', language)}</div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setUserLanguage('zh-TW')}
                                className={choiceClass(currentUser.language === 'zh-TW')}
                            >
                                {t('langZhTW', language)}
                            </button>
                            <button onClick={() => setUserLanguage('en')} className={choiceClass(currentUser.language === 'en')}>
                                {t('langEn', language)}
                            </button>
                        </div>
                    </div>
                )}

                <button
                    onClick={onStart}
                    disabled={!currentUser}
                    className="w-full min-h-[72px] bg-green-700 disabled:bg-slate-300 disabled:text-slate-700 text-white border-b-8 border-green-900 disabled:border-slate-400 text-3xl font-black py-4 rounded-2xl transition active:translate-y-2 active:border-b-0"
                >
                    {t('startPractice', language)}
                </button>
                {!currentUser && <p className="mt-3 text-lg text-amber-900 font-bold">{t('selectPlayerHint', language)}</p>}
            </div>
        </div>
    );
};
