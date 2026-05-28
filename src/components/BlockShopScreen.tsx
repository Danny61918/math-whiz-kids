import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { blockItems } from '../data/blockItems';
import { t } from '../utils/i18n';
import { BlockIcon } from './BlockIcon';
import { audioService } from '../services/audioService';

export const BlockShopScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { users, currentUserId, buyItem, language } = useGameStore();

    if (!currentUserId) return null;
    const currentUser = users[currentUserId];

    const handleBuy = (itemId: string, cost: number) => {
        if (buyItem(itemId, cost)) {
            audioService.playPop(); // Or a custom buy sound
        } else {
            audioService.playIncorrect(); // Insufficient funds sound
        }
    };

    const categories = ['block', 'decor', 'plant'] as const;

    return (
        <div className="min-h-screen bg-wood flex flex-col items-center p-4 font-sans relative overflow-hidden">
            {/* Subtle light overlay */}
            <div className="absolute inset-0 bg-amber-900/10 pointer-events-none"></div>
            
            <div className="w-full max-w-5xl z-10 relative">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 px-4">
                    <button
                        onClick={onBack}
                        className="bg-[#fefae0] hover:bg-white text-amber-800 font-bold py-2 px-6 rounded-full shadow-md transition border-2 border-[#bc8a5f]"
                    >
                        {t('backHome', language)}
                    </button>
                    <h1 className="text-5xl font-black text-white tracking-wider drop-shadow-md">
                        {t('shop', language)} 🛒
                    </h1>
                    <div className="bg-white py-2 px-6 rounded-full shadow-md border-2 border-[#bc8a5f] flex items-center gap-2">
                        <span className="text-amber-700 font-bold">{t('myCoins', language)}</span>
                        <span className="text-2xl font-black text-amber-600">{currentUser.coins} 🪙</span>
                    </div>
                </div>

                {/* Items Grid by Category */}
                <div className="space-y-8 pb-10">
                    {categories.map(cat => (
                        <div key={cat} className="bg-white/40 p-6 rounded-3xl border-2 border-[#bc8a5f]/30 shadow-sm">
                            <h2 className="text-2xl font-black text-amber-900 mb-6 px-4 capitalize flex items-center gap-2 drop-shadow-sm">
                                {cat === 'block' ? '🧱' : cat === 'plant' ? '🌿' : '🪟'}
                                {cat === 'block' ? (language === 'zh-TW' ? '建築方塊' : 'Building Blocks') :
                                 cat === 'decor' ? (language === 'zh-TW' ? '裝飾設備' : 'Decorations') :
                                 (language === 'zh-TW' ? '花草植物' : 'Plants & Nature')}
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {blockItems.filter(i => i.type === cat).map((item) => {
                                    // Make sure inventory is an object (migration safety)
                                    const inventory = Array.isArray(currentUser.inventory) ? {} : (currentUser.inventory || {});
                                    const count = inventory[item.id] || 0;
                                    const canAfford = currentUser.coins >= item.price;

                                    return (
                                        <div
                                            key={item.id}
                                            className="bg-[#fefae0] rounded-3xl p-4 flex flex-col items-center justify-between shadow-md border-[4px] border-[#e6ccb2] transition-transform hover:-translate-y-1 hover:shadow-lg"
                                        >
                                            <div className="w-16 h-16 mb-4 mt-2 relative flex items-center justify-center">
                                                <BlockIcon itemId={item.id} />
                                            </div>
                                            <h3 className="text-md font-bold text-amber-900 mb-1 text-center h-10 flex items-center justify-center">
                                                {t(item.nameKey as any, language) || item.nameKey}
                                            </h3>
                                            <div className="mb-3 font-black text-amber-600 text-xl">
                                                {item.price} 🪙
                                            </div>

                                            <button
                                                onClick={() => handleBuy(item.id, item.price)}
                                                disabled={!canAfford}
                                                className={`w-full font-bold py-2 rounded-xl transition shadow-sm active:translate-y-1 active:border-b-0 mb-2 border-b-4 ${canAfford
                                                    ? 'bg-green-500 hover:bg-green-400 text-white border-green-700'
                                                    : 'bg-neutral-200 text-neutral-400 border-neutral-300 cursor-not-allowed'
                                                    }`}
                                            >
                                                {canAfford ? t('buy', language) : t('insufficientFunds', language)}
                                            </button>

                                            <div className="text-sm font-bold text-amber-700/70 bg-amber-100/50 px-3 py-1 rounded-full">
                                                {t('owned', language)}: {count}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
