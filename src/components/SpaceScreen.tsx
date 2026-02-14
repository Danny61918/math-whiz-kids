import React, { useRef, useState, useEffect } from 'react';
import { useGameStore, type PlacedItem } from '../store/useGameStore';
import { shopItems } from '../data/shopItems';
import { t } from '../utils/i18n';
import { ItemIcon } from './ItemIcon';
import { audioService } from '../services/audioService';

const GRID_CELL_SIZE = 50;

export const SpaceScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { users, currentUserId, language, placeItem, moveItem, harvestPlot } = useGameStore();
    const currentUser = currentUserId ? users[currentUserId] : null;

    // Dragging state
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);
    const [showHarvestToast, setShowHarvestToast] = useState(false);

    // Edit Mode / Drag Mode Visualization
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState<{ x: number, y: number, w: number, h: number, isValid: boolean } | null>(null);

    // Prevent scrolling when touching the canvas
    useEffect(() => {
        const handleTouchMove = (e: TouchEvent) => {
            if (canvasRef.current && canvasRef.current.contains(e.target as Node)) {
                e.preventDefault();
            }
        };
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        // Clean up
        return () => document.removeEventListener('touchmove', handleTouchMove);
    }, []);

    if (!currentUser) return null;

    const inventory = Array.isArray(currentUser.inventory) ? {} : (currentUser.inventory || {});
    const placedItems = currentUser.placedItems || [];
    const landLevel = currentUser.landLevel || 1;

    // --- Grid Calculations ---
    // Start at 10x10 (Level 1), add 2x2 per level.
    // Level 1: 10x10 = 500px, Level 2: 12x12 = 600px, etc.
    const gridCols = 10 + (landLevel - 1) * 2;
    const gridRows = gridCols; // Square expansion for now
    const canvasWidthPx = gridCols * GRID_CELL_SIZE;
    const canvasHeightPx = gridRows * GRID_CELL_SIZE;

    // Helper: Check if a rect overlaps with any existing items (excluding itself)
    const checkCollision = (targetId: string | null, x: number, y: number, w: number, h: number) => {
        const targetRect = { left: x, right: x + w * GRID_CELL_SIZE, top: y, bottom: y + h * GRID_CELL_SIZE };

        for (const item of placedItems) {
            if (item.id === targetId) continue; // Skip self

            const itemDef = shopItems.find(i => i.id === item.itemId);
            if (!itemDef) continue;

            const itemW = (itemDef.width || 1) * GRID_CELL_SIZE;
            const itemH = (itemDef.height || 1) * GRID_CELL_SIZE;
            // Existing item rect usually has some padding? For now strict rect.
            // Items are stored with x,y (top-left).
            const itemRect = { left: item.x, right: item.x + itemW, top: item.y, bottom: item.y + itemH };

            // Intersection test
            if (targetRect.left < itemRect.right &&
                targetRect.right > itemRect.left &&
                targetRect.top < itemRect.bottom &&
                targetRect.bottom > itemRect.top) {
                return true; // Collision detected
            }
        }
        return false;
    };

    const handleDragStart = (item: PlacedItem) => {
        setDraggingId(item.id);
        setSelectedItem(null);
        setIsDragging(true);
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!draggingId || !canvasRef.current) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
        const rect = canvasRef.current.getBoundingClientRect();

        // Find the item definition to know its size
        const movingItem = placedItems.find(i => i.id === draggingId);
        if (!movingItem) return;
        const shopItem = shopItems.find(i => i.id === movingItem.itemId);
        const itemW = shopItem?.width || 1;
        const itemH = shopItem?.height || 1;
        const widthPx = itemW * GRID_CELL_SIZE;
        const heightPx = itemH * GRID_CELL_SIZE;

        // Calculate relative coordinates (Top-Left based)
        // Center the drag on the mouse/finger? Or top-left? 
        // Let's center it for better UX, then calculate top-left.
        let centerX = clientX - rect.left;
        let centerY = clientY - rect.top;

        let x = centerX - (widthPx / 2);
        let y = centerY - (heightPx / 2);

        // Boundary Clamping (Hard Limits)
        x = Math.max(0, Math.min(x, canvasWidthPx - widthPx));
        y = Math.max(0, Math.min(y, canvasHeightPx - heightPx));

        // Grid Snapping
        const snapX = Math.round(x / GRID_CELL_SIZE) * GRID_CELL_SIZE;
        const snapY = Math.round(y / GRID_CELL_SIZE) * GRID_CELL_SIZE;

        // Collision Check
        const hasCollision = checkCollision(draggingId, snapX, snapY, itemW, itemH);

        setDragPosition({
            x: snapX,
            y: snapY,
            w: itemW,
            h: itemH,
            isValid: !hasCollision
        });
    };

    const handleDragEnd = () => {
        if (draggingId && dragPosition) {
            if (dragPosition.isValid) {
                moveItem(draggingId, dragPosition.x, dragPosition.y);
                audioService.playPop(); // Snap sound
            } else {
                audioService.playIncorrect(); // Error sound
            }
        }
        setDraggingId(null);
        setIsDragging(false);
        setDragPosition(null);
    };

    // Global mouse/touch listeners
    useEffect(() => {
        if (draggingId) {
            const handleMove = (e: MouseEvent | TouchEvent) => handleDragMove(e as any);
            const handleUp = () => handleDragEnd();

            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
            window.addEventListener('touchmove', handleMove);
            window.addEventListener('touchend', handleUp);

            return () => {
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', handleUp);
                window.removeEventListener('touchmove', handleMove);
                window.removeEventListener('touchend', handleUp);
            };
        }
    }, [draggingId, dragPosition]);

    const handleItemClick = (e: React.MouseEvent, item: PlacedItem) => {
        e.stopPropagation();
        if (draggingId) return;

        // Harvest Check (only for plots)
        if (item.itemId === 'farm_plot' && (item.experience || 0) >= 100) {
            const success = harvestPlot(item.id);
            if (success) {
                audioService.playWin();
                setShowHarvestToast(true);
                setTimeout(() => setShowHarvestToast(false), 2000);
            }
            return;
        }

        setSelectedItem(item.id === selectedItem ? null : item.id);
    };

    // Handle initial placement from inventory
    const handlePlaceFromInventory = (itemId: string) => {
        // Find first empty spot? Or just add to center and let user resolve?
        // Let's try to find a valid spot
        const itemDef = shopItems.find(i => i.id === itemId);
        const w = itemDef?.width || 1;
        const h = itemDef?.height || 1;

        // Simple spiral search or just random valid spot?
        // For simplicity: Try center. If taken, try offset.
        // Actually, just placing at 0,0 or center is fine, user can move it.
        // BUT, we have collision now. We MUST find a valid spot or reject.

        let foundX = -1, foundY = -1;
        // Naive search: Scan grid
        for (let r = 0; r <= gridRows - h; r++) {
            for (let c = 0; c <= gridCols - w; c++) {
                const px = c * GRID_CELL_SIZE;
                const py = r * GRID_CELL_SIZE;
                if (!checkCollision(null, px, py, w, h)) {
                    foundX = px;
                    foundY = py;
                    break;
                }
            }
            if (foundX !== -1) break;
        }

        if (foundX !== -1) {
            placeItem(itemId, foundX, foundY);
            audioService.playPop();
        } else {
            // Farm Full!
            audioService.playIncorrect();
            // Simple toast or alert
            alert(t('insufficientFunds', language) === '餘額不足' ? '農場已滿！' : 'Farm is full!');
        }
    };

    // Clear All
    const handleClearAll = () => {
        if (window.confirm(t('clearAllConfirm' as any, language))) {
            const { removeAllPlacedItems } = useGameStore.getState();
            removeAllPlacedItems();
            audioService.playIncorrect(); // Use as "whoosh" undo sound
        }
    };

    // Expansion Effect
    useEffect(() => {
        // Detect level up? We don't have previous level in state easily without ref.
        // But we can play sound if we just bought it? 
        // Actually the buy action is in store. 
        // Let's just rely on the 'pop' sound for regular placement for now, 
        // and maybe if we had a way to detect changes...
        // For V1 polish: Let's focus on the harvest effect.
    }, [landLevel]);

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans overflow-hidden">
            {/* Sidebar Inventory */}
            <div className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-xl z-20 shrink-0">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-purple-600 text-white">
                    <button onClick={onBack} className="text-xl hover:scale-110 transition">🏠</button>
                    <div className="flex flex-col items-center">
                        <h2 className="font-bold text-lg">{t('name', language)}'s Farm</h2>
                        <span className="text-xs bg-purple-700 px-2 py-0.5 rounded-full">Lv.{landLevel} ({gridCols}x{gridRows})</span>
                    </div>
                </div>

                {/* Inventory List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <h3 className="font-bold text-slate-500 text-sm uppercase tracking-wider flex justify-between items-center">
                        {t('shop' as any, language).split(' ')[0]} {/* Reuse shop label or add inventory label */}
                        <button
                            onClick={handleClearAll}
                            className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200"
                        >
                            {t('clearAll' as any, language)}
                        </button>
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        {shopItems.map(item => {
                            if (item.id === 'land_expansion') return null;
                            const count = inventory[item.id] || 0;
                            if (count === 0) return null;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handlePlaceFromInventory(item.id)}
                                    className="flex flex-col items-center p-2 rounded-xl border-2 border-slate-100 hover:border-purple-300 hover:bg-purple-50 transition active:scale-95"
                                >
                                    <div className="w-10 h-10 mb-1 pointer-events-none">
                                        <ItemIcon itemId={item.id} type={item.type} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-600 text-center">{t(item.nameKey as any, language)}</span>
                                    {/* Show dimension hint */}
                                    <span className="text-[10px] text-slate-400">{(item.width || 1)}x{(item.height || 1)}</span>
                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full mt-1">x{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Farm Canvas Scroll Area */}
            <div className="flex-1 relative overflow-auto bg-green-800 flex items-center justify-center p-10 cursor-move"
                style={{
                    backgroundImage: 'radial-gradient(#4ade80 2px, transparent 2px)',
                    backgroundSize: '30px 30px',
                    opacity: 1
                }}
            >
                {/* Scalable Canvas Container */}
                <div
                    className="relative bg-green-100 shadow-2xl transition-all duration-500 ease-out"
                    ref={canvasRef}
                    onClick={() => setSelectedItem(null)}
                    style={{
                        width: canvasWidthPx,
                        height: canvasHeightPx,
                        flexShrink: 0,
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    {/* Grid Lines */}
                    <div
                        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                        style={{
                            backgroundImage: 'linear-gradient(#000000 1px, transparent 1px), linear-gradient(90deg, #000000 1px, transparent 1px)',
                            backgroundSize: `${GRID_CELL_SIZE}px ${GRID_CELL_SIZE}px`,
                            opacity: isDragging ? 0.3 : 0.08
                        }}
                    />

                    {/* Placed Items */}
                    {placedItems.map(placed => {
                        const itemDef = shopItems.find(i => i.id === placed.itemId);
                        if (!itemDef) return null;

                        const zIndex = Math.floor(placed.y);

                        // Dimensions
                        const w = (itemDef.width || 1) * GRID_CELL_SIZE;
                        const h = (itemDef.height || 1) * GRID_CELL_SIZE;

                        const isPlant = itemDef.type === 'plant';
                        const isAnimal = itemDef.type === 'animal';
                        const isPlot = placed.itemId === 'farm_plot';
                        const canHarvest = isPlot && (placed.experience || 0) >= 100;
                        const isBeingDragged = draggingId === placed.id;

                        if (isBeingDragged) return null;

                        return (
                            <div
                                key={placed.id}
                                onMouseDown={() => handleDragStart(placed)}
                                onTouchStart={() => handleDragStart(placed)}
                                onClick={(e) => {
                                    if (isAnimal) audioService.playAnimalSound(placed.itemId);
                                    handleItemClick(e, placed);
                                }}
                                style={{
                                    position: 'absolute',
                                    left: placed.x,
                                    top: placed.y,
                                    width: w,
                                    height: h,
                                    zIndex: zIndex,
                                    cursor: canHarvest ? 'pointer' : 'grab',
                                    transition: 'transform 0.1s',
                                }}
                                className={`group hover:brightness-110 relative
                                    ${isPlant ? 'animate-sway' : ''} 
                                    ${isAnimal ? 'animate-wander' : ''}
                                    ${canHarvest ? 'animate-bounce drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : ''}`}
                            >
                                {/* Content */}
                                <div className="w-full h-full relative">
                                    <ItemIcon itemId={placed.itemId} type={itemDef.type} experience={placed.experience} />

                                    {/* Info Bubble */}
                                    {selectedItem === placed.id && (
                                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1.5 rounded-lg shadow-xl text-sm font-bold z-50 pointer-events-none whitespace-nowrap text-slate-700 border border-slate-100 flex flex-col items-center">
                                            {canHarvest ? (
                                                <span className="text-yellow-600 animate-pulse">✨ {t('harvest', language)}! ✨</span>
                                            ) : (
                                                <>
                                                    <span>{t(itemDef.nameKey as any, language)}</span>
                                                    {isPlot && <div className="w-full bg-slate-200 h-1.5 mt-1 rounded-full overflow-hidden">
                                                        <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${Math.min(100, placed.experience || 0)}%` }} />
                                                    </div>}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Drag Preview */}
                    {isDragging && dragPosition && draggingId && (() => {
                        const item = placedItems.find(i => i.id === draggingId);
                        const itemDef = shopItems.find(i => i.id === item?.itemId);
                        if (!item || !itemDef) return null;

                        const w = dragPosition.w * GRID_CELL_SIZE;
                        const h = dragPosition.h * GRID_CELL_SIZE;

                        return (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: dragPosition.x,
                                    top: dragPosition.y,
                                    width: w,
                                    height: h,
                                    zIndex: 99999,
                                    pointerEvents: 'none',
                                    opacity: 0.9,
                                }}
                            >
                                {!dragPosition.isValid ? (
                                    <div className="absolute inset-0 bg-red-400/60 border-4 border-red-500 rounded-lg animate-pulse z-10 flex items-center justify-center">
                                        <span className="text-white font-bold text-2xl drop-shadow-md">❌</span>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 bg-green-400/30 border-4 border-green-500 rounded-lg z-10 box-border" />
                                )}
                                <ItemIcon itemId={item.itemId} type={itemDef.type} experience={item.experience} />
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Harvest Toast */}
            {showHarvestToast && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-300 text-yellow-900 px-8 py-6 rounded-3xl shadow-2xl border-4 border-white animate-bounce-gentle z-50 flex flex-col items-center pointer-events-none scale-125">
                    <span className="text-6xl mb-2">💰</span>
                    <span className="font-black text-3xl whitespace-nowrap drop-shadow-sm">+500 Coins!</span>
                </div>
            )}
        </div>
    );
};
