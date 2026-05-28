import React from 'react';
import { blockItems } from '../data/blockItems';

interface BlockIconProps {
    itemId: string;
    className?: string;
}

export const BlockIcon: React.FC<BlockIconProps> = ({ itemId, className = "w-full h-full" }) => {
    const itemDef = blockItems.find(i => i.id === itemId);
    if (!itemDef) return null;

    if (itemDef.type === 'block') {
        const color = itemDef.color || '#cccccc';
        const isGlass = itemId === 'block_glass';
        
        return (
            <svg viewBox="0 0 100 100" className={className} style={{ opacity: isGlass ? 0.6 : 1 }}>
                {/* Main Body */}
                <rect x="0" y="0" width="100" height="100" fill={color} rx="12" />
                {/* Inner shadow/highlight to make it look like a 3D bevel block */}
                <path d="M 0 12 Q 0 0 12 0 L 88 0 Q 100 0 100 12 L 85 15 L 15 15 Z" fill="white" opacity="0.3" />
                <path d="M 0 12 Q 0 0 12 0 L 15 15 L 15 85 L 0 88 Z" fill="white" opacity="0.15" />
                <path d="M 0 88 Q 0 100 12 100 L 88 100 Q 100 100 100 88 L 85 85 L 15 85 Z" fill="black" opacity="0.25" />
                <path d="M 100 12 Q 100 0 88 0 L 85 15 L 85 85 L 100 88 Z" fill="black" opacity="0.15" />

                {itemDef.id === 'block_wood' && (
                    <g opacity="0.4" stroke="#451a03" strokeWidth="3" fill="none" strokeLinecap="round">
                        <path d="M 20 25 Q 50 35 80 20 M 15 50 Q 50 60 85 45 M 20 75 Q 50 85 80 70 M 60 20 V 50 M 35 50 V 80" />
                    </g>
                )}
                {itemDef.id === 'block_stone' && (
                    <g opacity="0.3" fill="black">
                        <path d="M 20 20 L 40 15 L 45 35 L 25 40 Z M 60 20 L 85 25 L 75 45 L 50 40 Z M 30 60 L 70 55 L 80 85 L 25 80 Z" fill="#1e293b"/>
                    </g>
                )}
                {isGlass && (
                    <g opacity="0.5" stroke="white" strokeWidth="4" fill="none">
                        <path d="M 20 80 L 80 20 M 30 80 L 80 30" />
                    </g>
                )}
            </svg>
        );
    }

    if (itemDef.type === 'decor') {
        switch (itemId) {
            case 'decor_door':
                return (
                    <svg viewBox="0 0 100 200" className={className}>
                        <rect x="10" y="10" width="80" height="190" fill="#78350F" rx="5" />
                        <rect x="20" y="20" width="60" height="75" fill="#92400E" rx="5" />
                        <rect x="20" y="105" width="60" height="75" fill="#92400E" rx="5" />
                        <circle cx="80" cy="100" r="5" fill="#FCD34D" />
                    </svg>
                );
            case 'decor_window':
                return (
                    <svg viewBox="0 0 200 200" className={className}>
                        <rect x="10" y="10" width="180" height="180" fill="#E2E8F0" rx="10" />
                        <rect x="20" y="20" width="75" height="75" fill="#BAE6FD" rx="5" />
                        <rect x="105" y="20" width="75" height="75" fill="#BAE6FD" rx="5" />
                        <rect x="20" y="105" width="75" height="75" fill="#BAE6FD" rx="5" />
                        <rect x="105" y="105" width="75" height="75" fill="#BAE6FD" rx="5" />
                    </svg>
                );
            case 'decor_roof_red':
            case 'decor_roof_blue':
                const roofColor = itemId === 'decor_roof_red' ? '#EF4444' : '#3B82F6';
                return (
                    <svg viewBox="0 0 200 100" className={className}>
                        <polygon points="100,10 10,90 190,90" fill={roofColor} />
                        <polygon points="100,10 10,90 100,90" fill="white" opacity="0.2" />
                    </svg>
                );
            case 'decor_chimney':
                return (
                    <svg viewBox="0 0 100 200" className={className}>
                        <rect x="30" y="20" width="40" height="180" fill="#B91C1C" />
                        <rect x="20" y="10" width="60" height="20" fill="#7F1D1D" rx="2" />
                        <path d="M 50 10 Q 40 -10 60 -20 Q 70 -30 50 -40" stroke="gray" strokeWidth="8" strokeDasharray="5,10" fill="none" opacity="0.5" />
                        {/* Brick Lines */}
                        <path d="M 30 50 h 40 M 30 80 h 40 M 30 110 h 40 M 30 140 h 40 M 30 170 h 40 M 50 20 v 30 M 40 50 v 30 M 60 80 v 30 M 45 110 v 30 M 55 140 v 30 M 40 170 v 30" stroke="#7F1D1D" strokeWidth="2" />
                    </svg>
                );
            case 'decor_lamp':
                return (
                    <svg viewBox="0 0 100 200" className={className}>
                        <rect x="45" y="50" width="10" height="150" fill="#475569" />
                        <circle cx="50" cy="40" r="25" fill="#FEF08A" className="animate-pulse" />
                        <path d="M 30 20 L 70 20 L 60 50 L 40 50 Z" fill="#1E293B" />
                    </svg>
                );
        }
    }

    if (itemDef.type === 'plant') {
        switch (itemId) {
            case 'plant_grass':
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <path d="M 20 90 Q 30 60 40 85 M 40 90 Q 50 40 60 90 M 60 90 Q 70 60 80 85 M 10 90 Q 25 70 30 90 M 70 90 Q 85 70 90 90" stroke="#22C55E" strokeWidth="6" strokeLinecap="round" fill="none" />
                    </svg>
                );
            case 'plant_flower_red':
            case 'plant_flower_blue':
                const flowerColor = itemId === 'plant_flower_red' ? '#EF4444' : '#3B82F6';
                return (
                    <svg viewBox="0 0 100 100" className={className}>
                        <path d="M 50 90 Q 50 60 50 50" stroke="#16A34A" strokeWidth="4" />
                        <circle cx="50" cy="35" r="10" fill="#FACC15" />
                        <circle cx="35" cy="35" r="8" fill={flowerColor} />
                        <circle cx="65" cy="35" r="8" fill={flowerColor} />
                        <circle cx="50" cy="20" r="8" fill={flowerColor} />
                        <circle cx="50" cy="50" r="8" fill={flowerColor} />
                        <path d="M 50 70 Q 30 60 40 50" stroke="#16A34A" strokeWidth="3" fill="none" />
                        <path d="M 50 80 Q 70 70 60 60" stroke="#16A34A" strokeWidth="3" fill="none" />
                    </svg>
                );
            case 'plant_bush':
                return (
                    <svg viewBox="0 0 200 100" className={className}>
                        <ellipse cx="100" cy="70" rx="80" ry="30" fill="#15803D" />
                        <circle cx="60" cy="50" r="30" fill="#16A34A" />
                        <circle cx="100" cy="40" r="35" fill="#22C55E" />
                        <circle cx="140" cy="50" r="30" fill="#16A34A" />
                        {/* Berries */}
                        <circle cx="70" cy="40" r="4" fill="#EF4444" />
                        <circle cx="110" cy="30" r="4" fill="#EF4444" />
                        <circle cx="130" cy="60" r="4" fill="#EF4444" />
                    </svg>
                );
            case 'plant_tree':
                return (
                    <svg viewBox="0 0 300 400" className={className}>
                        <rect x="130" y="200" width="40" height="200" fill="#78350F" />
                        <circle cx="150" cy="150" r="120" fill="#15803D" />
                        <circle cx="100" cy="100" r="80" fill="#16A34A" />
                        <circle cx="200" cy="120" r="90" fill="#22C55E" />
                        <circle cx="80" cy="180" r="70" fill="#16A34A" />
                        <circle cx="220" cy="200" r="80" fill="#22C55E" />
                    </svg>
                );
        }
    }

    return null;
};
