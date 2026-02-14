import React from 'react';

interface ItemIconProps {
    itemId: string;
    type: 'building' | 'plant' | 'animal';
    experience?: number;
    className?: string;
}

export const ItemIcon: React.FC<ItemIconProps> = ({ itemId, type, experience = 0, className = "w-full h-full" }) => {

    // Helper for Plant Growth Stages based on XP
    // 0-49: Seed/Sprout
    // 50-99: Growing
    // 100+: Mature
    const getPlantStage = () => {
        if (experience < 50) return 'stage1';
        if (experience < 100) return 'stage2';
        return 'stage3';
    };

    // --- Special Items ---
    if (itemId === 'farm_plot') {
        // 0-49: Dirt
        // 50-99: Sprout
        // 100+: Harvest Ready
        if (experience < 50) {
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <rect x="10" y="10" width="80" height="80" fill="#8B4513" rx="10" />
                    <circle cx="30" cy="30" r="5" fill="#654321" />
                    <circle cx="70" cy="70" r="5" fill="#654321" />
                    <path d="M20 20 L80 80 M80 20 L20 80" stroke="#654321" strokeWidth="2" opacity="0.5" />
                </svg>
            );
        }
        if (experience < 100) {
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <rect x="10" y="10" width="80" height="80" fill="#8B4513" rx="10" />
                    <path d="M50 80 Q50 20 50 40" stroke="#4ADE80" strokeWidth="8" fill="none" />
                    <ellipse cx="35" cy="40" rx="15" ry="8" fill="#4ADE80" transform="rotate(-20 35 40)" />
                    <ellipse cx="65" cy="40" rx="15" ry="8" fill="#4ADE80" transform="rotate(20 65 40)" />
                </svg>
            );
        }
        // Mature / Harvest Ready
        return (
            <svg viewBox="0 0 100 100" className={className}>
                <rect x="10" y="10" width="80" height="80" fill="#8B4513" rx="10" />
                <path d="M50 90 L50 30" stroke="#22C55E" strokeWidth="8" />
                {/* Corn Cobs */}
                <ellipse cx="35" cy="50" rx="12" ry="25" fill="#FACC15" transform="rotate(-20 35 50)" />
                <ellipse cx="65" cy="50" rx="12" ry="25" fill="#FACC15" transform="rotate(20 65 50)" />
                {/* Leaves */}
                <path d="M50 30 Q20 30 20 60" stroke="#22C55E" strokeWidth="4" fill="none" />
                <path d="M50 30 Q80 30 80 60" stroke="#22C55E" strokeWidth="4" fill="none" />
                {/* Sparkles for Harvest */}
                <circle cx="20" cy="20" r="5" fill="#FFFF00" className="animate-pulse" />
                <circle cx="80" cy="20" r="5" fill="#FFFF00" className="animate-pulse" />
            </svg>
        );
    }

    if (itemId === 'land_expansion') {
        return (
            <svg viewBox="0 0 100 100" className={className}>
                <rect x="10" y="10" width="80" height="80" fill="#E2E8F0" rx="10" stroke="#94A3B8" strokeWidth="5" strokeDasharray="10,5" />
                <path d="M50 30 L50 70 M30 50 L70 50" stroke="#3B82F6" strokeWidth="10" strokeLinecap="round" />
            </svg>
        );
    }

    // --- Buildings ---
    if (type === 'building') {
        switch (itemId) {
            case 'cabin':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <rect x="20" y="40" width="60" height="50" fill="#B45309" />
                        <polygon points="10,40 50,10 90,40" fill="#78350F" />
                        <rect x="40" y="60" width="20" height="30" fill="#4B2C20" />
                        <circle cx="55" cy="75" r="2" fill="#FCD34D" />
                    </svg>
                );
            case 'barn':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <rect x="15" y="40" width="70" height="50" fill="#DC2626" />
                        <polygon points="15,40 50,15 85,40" fill="#991B1B" />
                        <rect x="35" y="55" width="30" height="35" fill="white" />
                        <path d="M35 55 L65 90 M65 55 L35 90" stroke="#991B1B" strokeWidth="3" />
                    </svg>
                );
            case 'fence':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <rect x="10" y="30" width="10" height="60" fill="#FDE68A" rx="2" />
                        <rect x="80" y="30" width="10" height="60" fill="#FDE68A" rx="2" />
                        <rect x="5" y="40" width="90" height="10" fill="#D97706" rx="2" />
                        <rect x="5" y="70" width="90" height="10" fill="#D97706" rx="2" />
                    </svg>
                );
            case 'fountain':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <ellipse cx="50" cy="80" rx="40" ry="15" fill="#CBD5E1" />
                        <rect x="40" y="50" width="20" height="30" fill="#94A3B8" />
                        <circle cx="50" cy="40" r="15" fill="#60A5FA" />
                        <path d="M50 40 Q40 20 30 50 M50 40 Q60 20 70 50" stroke="#93C5FD" strokeWidth="3" fill="none" />
                    </svg>
                );
            case 'windmill':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <path d="M35 90 L45 40 L55 40 L65 90 Z" fill="#FDBA74" />
                        <circle cx="50" cy="40" r="5" fill="#7C2D12" />
                        <g className="animate-[spin_4s_linear_infinite] origin-[50px_40px]">
                            <rect x="45" y="5" width="10" height="35" fill="#E0F2FE" rx="2" />
                            <rect x="45" y="40" width="10" height="35" fill="#E0F2FE" rx="2" transform="rotate(120 50 40)" />
                            <rect x="45" y="40" width="10" height="35" fill="#E0F2FE" rx="2" transform="rotate(240 50 40)" />
                        </g>
                    </svg>
                );
            case 'cottage':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <rect x="25" y="50" width="50" height="40" fill="#FEF3C7" />
                        <path d="M20 50 L50 20 L80 50 Z" fill="#EF4444" />
                        <rect x="60" y="35" width="10" height="20" fill="#78350F" />
                        <rect x="40" y="65" width="20" height="25" fill="#B45309" rx="5" />
                    </svg>
                );
            case 'tent':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <path d="M20 90 L50 20 L80 90 Z" fill="#14B8A6" />
                        <path d="M45 90 L50 40 L55 90 Z" fill="#0F766E" />
                    </svg>
                );
            case 'castle':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <rect x="20" y="50" width="20" height="40" fill="#94A3B8" />
                        <rect x="60" y="50" width="20" height="40" fill="#94A3B8" />
                        <rect x="30" y="60" width="40" height="30" fill="#64748B" />
                        <polygon points="20,50 20,40 25,50 30,40 35,50 40,40 40,50" fill="#475569" />
                        <polygon points="60,50 60,40 65,50 70,40 75,50 80,40 80,50" fill="#475569" />
                        <rect x="45" y="70" width="10" height="20" fill="#1E293B" rx="5" />
                        <path d="M20 40 L30 20 L40 40 Z" fill="#3B82F6" />
                        <path d="M60 40 L70 20 L80 40 Z" fill="#3B82F6" />
                    </svg>
                );
            default:
                return null;
        }
    }

    // --- Plants ---
    if (type === 'plant') {
        const stage = getPlantStage();

        // Common Seed/Sprout stages
        if (stage === 'stage1') {
            return (
                <svg viewBox="0 0 100 100" className={className}>
                    <path d="M50 90 L50 60" stroke="#4ADE80" strokeWidth="4" />
                    <ellipse cx="40" cy="60" rx="10" ry="5" fill="#4ADE80" transform="rotate(-20 40 60)" />
                    <ellipse cx="60" cy="60" rx="10" ry="5" fill="#4ADE80" transform="rotate(20 60 60)" />
                </svg>
            );
        }

        // Mature stages
        switch (itemId) {
            case 'tree_apple':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <rect x="45" y="60" width="10" height="30" fill="#78350F" />
                        <circle cx="50" cy="45" r="30" fill="#22C55E" />
                        <circle cx="40" cy="35" r="5" fill="#EF4444" />
                        <circle cx="60" cy="45" r="5" fill="#EF4444" />
                        <circle cx="50" cy="55" r="5" fill="#EF4444" />
                    </svg>
                );
            case 'trees_oak': // itemOak
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <rect x="42" y="60" width="16" height="30" fill="#78350F" />
                        <path d="M50 10 Q80 10 90 50 Q50 90 10 50 Q20 10 50 10 Z" fill="#15803D" />
                    </svg>
                );
            case 'sunflower':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <path d="M50 90 L50 40" stroke="#16A34A" strokeWidth="4" />
                        <circle cx="50" cy="35" r="15" fill="#78350F" />
                        {Array.from({ length: 8 }).map((_, i) => (
                            <ellipse
                                key={i}
                                cx="50" cy="35" rx="8" ry="25"
                                fill="#FACC15"
                                transform={`rotate(${i * 45} 50 35) translate(0 -15)`}
                            />
                        ))}
                    </svg>
                );
            case 'grass':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <path d="M20 90 Q30 60 40 80" stroke="#4ADE80" strokeWidth="4" fill="none" />
                        <path d="M40 90 Q50 40 60 90" stroke="#22C55E" strokeWidth="4" fill="none" />
                        <path d="M70 90 Q80 70 90 85" stroke="#4ADE80" strokeWidth="4" fill="none" />
                    </svg>
                );
            case 'rose':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <path d="M50 90 L50 40" stroke="#15803D" strokeWidth="3" />
                        <circle cx="50" cy="35" r="10" fill="#BE123C" />
                        <circle cx="50" cy="35" r="7" fill="#E11D48" />
                        <circle cx="50" cy="35" r="4" fill="#FDA4AF" />
                    </svg>
                );
            case 'corn':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <path d="M50 90 L50 20" stroke="#16A34A" strokeWidth="4" />
                        <ellipse cx="50" cy="50" rx="10" ry="25" fill="#FACC15" />
                        <path d="M50 70 Q30 60 50 40" stroke="#16A34A" strokeWidth="3" fill="none" />
                    </svg>
                );
            case 'pine':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <rect x="45" y="80" width="10" height="15" fill="#78350F" />
                        <path d="M20 80 L50 20 L80 80 Z" fill="#166534" />
                    </svg>
                );
            case 'cactus':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <rect x="40" y="40" width="20" height="50" rx="10" fill="#15803D" />
                        <rect x="25" y="50" width="15" height="10" rx="5" fill="#15803D" />
                        <rect x="25" y="40" width="10" height="20" rx="5" fill="#15803D" />
                        <rect x="60" y="60" width="15" height="10" rx="5" fill="#15803D" />
                        <rect x="65" y="50" width="10" height="20" rx="5" fill="#15803D" />
                    </svg>
                );
            case 'mushroom':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <rect x="40" y="60" width="20" height="30" fill="#FEF3C7" />
                        <path d="M30 60 Q50 20 70 60 Z" fill="#DC2626" />
                        <circle cx="40" cy="50" r="3" fill="white" opacity="0.8" />
                        <circle cx="60" cy="45" r="4" fill="white" opacity="0.8" />
                    </svg>
                );
            default:
                // Fallback for missing plant SVGs
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <circle cx="50" cy="50" r="30" fill="#22C55E" />
                    </svg>
                );
        }
    }

    // --- Animals ---
    if (type === 'animal') {
        switch (itemId) {
            case 'chick':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <circle cx="50" cy="60" r="20" fill="#FACC15" />
                        <circle cx="50" cy="45" r="15" fill="#FACC15" />
                        <circle cx="55" cy="40" r="2" fill="black" />
                        <path d="M58 45 L65 42 L58 48 Z" fill="#F97316" />
                        <path d="M40 75 L45 85 M60 75 L55 85" stroke="#F97316" strokeWidth="3" />
                    </svg>
                );
            case 'dog':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <ellipse cx="50" cy="60" rx="25" ry="20" fill="#B45309" />
                        <circle cx="50" cy="40" r="18" fill="#B45309" />
                        <circle cx="45" cy="35" r="2" fill="white" />
                        <circle cx="55" cy="35" r="2" fill="white" />
                        <rect x="65" y="50" width="10" height="5" fill="#B45309" transform="rotate(-20)" />
                    </svg>
                );
            case 'cow':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <rect x="30" y="50" width="40" height="30" fill="white" stroke="black" strokeWidth="2" />
                        <circle cx="60" cy="40" r="15" fill="white" stroke="black" strokeWidth="2" />
                        <path d="M35 55 L40 60 L45 55" fill="black" />
                        <path d="M50 65 L60 70 L55 60" fill="black" />
                    </svg>
                );
            // Include other animals as generic placeholders for now to save space, or specific ones if critical
            case 'cat':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <ellipse cx="50" cy="60" rx="20" ry="15" fill="#374151" />
                        <circle cx="50" cy="45" r="15" fill="#374151" />
                        <path d="M38 35 L40 20 L48 35 Z" fill="#374151" />
                        <path d="M62 35 L60 20 L52 35 Z" fill="#374151" />
                    </svg>
                );
            default:
                // Generic Animal Fallback
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <circle cx="50" cy="50" r="25" fill="#FDA4AF" />
                        <circle cx="40" cy="45" r="3" fill="black" />
                        <circle cx="60" cy="45" r="3" fill="black" />
                    </svg>
                );
        }
    }

    return null;
};
