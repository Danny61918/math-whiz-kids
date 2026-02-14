import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { shopItems } from '../data/shopItems';
import { t } from '../utils/i18n';
import { ItemIcon } from './ItemIcon';
import { audioService } from '../services/audioService';

export const ShopScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    console.log('Shop Items:', shopItems);
    const { users, currentUserId, language, buyItem } = useGameStore();
    const currentUser = currentUserId ? users[currentUserId] : null;

    if (!currentUser) return null;

    const handleBuy = (itemId: string, price: number) => {
        const success = buyItem(itemId, price);
        if (success) {
            audioService.playCorrect(); // Reuse correct sound for purchase
            // Optional: Add visual celebration
        } else {
            audioService.playIncorrect(); // Reuse incorrect sound for failure
        }
    };

    // Migration helper: ensure inventory is treated as Record<string, number>
    const inventory = Array.isArray(currentUser.inventory) ? {} : (currentUser.inventory || {});

    // Group items by type
    const categories = ['building', 'plant', 'animal'] as const;

    return (
        <div className="min-h-screen bg-green-50 flex flex-col items-center p-4 font-sans">
            <div className="w-full max-w-5xl">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 px-4">
                    <button
                        onClick={onBack}
                        className="bg-white hover:bg-gray-100 text-gray-600 font-bold py-2 px-6 rounded-full shadow-md transition"
                    >
                        {t('backHome', language)}
                    </button>
                    <h1 className="text-4xl font-black text-green-700 tracking-wider">
                        {t('shop', language)} 🛍️
                    </h1>
                    <div className="bg-white py-2 px-6 rounded-full shadow-md border-2 border-yellow-300">
                        <span className="text-gray-600 font-bold mr-2">{t('myCoins', language)}</span>
                        <span className="text-2xl font-black text-yellow-500">{currentUser.coins} 🪙</span>
                    </div>
                </div>

                {/* Items Grid by Category */}
                <div className="space-y-8 pb-10">
                    {categories.map(cat => (
                        <div key={cat}>
                            <h2 className="text-2xl font-bold text-green-800 mb-4 px-4 capitalize flex items-center gap-2">
                                {cat === 'building' ? '🏠' : cat === 'plant' ? '🌱' : '🐶'} {t(`cat_${cat}` as any, language)}
                            </h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {shopItems.filter(i => i.type === cat).map((item) => {
                                    const count = inventory[item.id] || 0;
                                    const canAfford = currentUser.coins >= item.price;
                                    const name = t(item.nameKey as any, language);

                                    return (
                                        <div
                                            key={item.id}
                                            className="bg-white rounded-3xl p-4 flex flex-col items-center justify-between shadow-lg border-b-4 border-green-200 transition-transform hover:scale-105"
                                        >
                                            <div className="w-20 h-20 mb-2 mt-1 relative">
                                                <ItemIcon itemId={item.id} type={item.type} />
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-700 mb-1 text-center">{name}</h3>
                                            <div className="mb-3 font-black text-yellow-500 text-lg">
                                                {item.price} 🪙
                                            </div>

                                            <button
                                                onClick={() => handleBuy(item.id, item.price)}
                                                disabled={!canAfford}
                                                className={`w-full font-bold py-2 rounded-xl transition shadow-sm active:scale-95 mb-2 ${canAfford
                                                    ? 'bg-green-500 hover:bg-green-600 text-white'
                                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {canAfford ? t('buy', language) : t('insufficientFunds', language)}
                                            </button>

                                            <div className="text-sm font-bold text-gray-500">
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
