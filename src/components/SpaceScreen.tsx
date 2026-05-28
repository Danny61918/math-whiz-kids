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

    // Drag Mode Visualization
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState<{ x: number, y: number, w: number, h: number, isValid: boolean } | null>(null);

    // Removed unconditional touchmove listener (lines 25-34) to allow map panning when not dragging items.

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

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        if (!draggingId || !canvasRef.current) return;

        // Critical: Prevent scrolling while dragging an item
        if (e.cancelable) {
            e.preventDefault();
        }

        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
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
            const handleMove = (e: MouseEvent | TouchEvent) => handleDragMove(e);
            const handleUp = () => handleDragEnd();

            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
            // Use passive: false to allow preventDefault()
            window.addEventListener('touchmove', handleMove, { passive: false });
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
        <div className="min-h-screen bg-neutral-950 flex font-sans overflow-hidden">
            {/* Sidebar Inventory */}
            <div className="w-64 bg-neutral-900 border-r border-neutral-800 flex flex-col shadow-xl z-20 shrink-0">
                <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950 text-neutral-100">
                    <button onClick={onBack} className="text-xl hover:scale-110 transition opacity-80 hover:opacity-100">🏠</button>
                    <div className="flex flex-col items-center">
                        <h2 className="font-bold text-lg">{t('name', language)}'s Farm</h2>
                        <span className="text-xs bg-neutral-800 px-2 py-0.5 rounded-full text-neutral-400 border border-neutral-700">Lv.{landLevel} ({gridCols}x{gridRows})</span>
                    </div>
                </div>

                {/* Inventory List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <h3 className="font-bold text-neutral-500 text-sm uppercase tracking-wider flex justify-between items-center">
                        {t('shop' as any, language).split(' ')[0]} {/* Reuse shop label or add inventory label */}
                        <button
                            onClick={handleClearAll}
                            className="text-xs bg-neutral-800 text-neutral-400 px-2 py-1 rounded hover:bg-neutral-700 transition"
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
                                    className="flex flex-col items-center p-2 rounded-xl border border-neutral-800 bg-neutral-800/50 hover:border-neutral-500 hover:bg-neutral-800 transition active:scale-95 group"
                                >
                                    <div className="w-10 h-10 mb-1 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                                        <ItemIcon itemId={item.id} type={item.type} />
                                    </div>
                                    <span className="text-xs font-bold text-neutral-400 text-center">{t(item.nameKey as any, language)}</span>
                                    {/* Show dimension hint */}
                                    <span className="text-[10px] text-neutral-600">{(item.width || 1)}x{(item.height || 1)}</span>
                                    <span className="bg-neutral-700 text-neutral-300 text-xs font-bold px-2 py-0.5 rounded-full mt-1 border border-neutral-600">x{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Farm Canvas Scroll Area */}
            <div className="flex-1 relative overflow-auto flex items-center justify-center p-10 cursor-move bg-gradient-to-b from-sky-400 via-sky-200 to-green-500"
            >
                {/* Ambient Animations */}
                <div className="absolute top-10 left-[10%] text-white/80 text-8xl animate-pulse pointer-events-none">☁️</div>
                <div className="absolute top-24 right-[20%] text-white/60 text-6xl animate-pulse pointer-events-none" style={{ animationDelay: '1.5s' }}>☁️</div>
                <div className="absolute top-8 right-10 text-yellow-300 text-7xl animate-spin-slow pointer-events-none" style={{ animationDuration: '20s' }}>☀️</div>
                {/* Scalable Canvas Container */}
                <div
                    className="relative bg-green-400 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500 ease-out border-8 border-green-700/50 rounded-2xl overflow-hidden"
                    ref={canvasRef}
                    onClick={() => setSelectedItem(null)}
                    style={{
                        width: canvasWidthPx,
                        height: canvasHeightPx,
                        flexShrink: 0,
                    }}
                >
                    {/* Grid Lines */}
                    <div
                        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                        style={{
                            backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
                            backgroundSize: `${GRID_CELL_SIZE}px ${GRID_CELL_SIZE}px`,
                            opacity: isDragging ? 0.8 : 0.4
                        }}
                    />

                    {/* Placed Items */}
                    {placedItems.map(placed => {
                        const itemDef = shopItems.find(i => i.id === placed.itemId);
                        if (!itemDef) return null;

                        const itemH = (itemDef.height || 1) * GRID_CELL_SIZE;
                        const zIndex = Math.floor(placed.y + itemH);

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
                                    touchAction: 'none', // Crucial for mobile drag
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none',
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
                                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-neutral-800 px-3 py-1.5 rounded-lg shadow-xl text-sm font-bold z-50 pointer-events-none whitespace-nowrap text-neutral-200 border border-neutral-600 flex flex-col items-center">
                                            {canHarvest ? (
                                                <span className="text-yellow-500 animate-pulse">✨ {t('harvest', language)}! ✨</span>
                                            ) : (
                                                <>
                                                    <span>{t(itemDef.nameKey as any, language)}</span>
                                                    {isPlot && <div className="w-full bg-neutral-700 h-2 mt-1 rounded-full overflow-hidden border border-neutral-900">
                                                        <div className="h-full bg-gradient-to-r from-green-400 to-green-300 transition-all duration-500" style={{ width: `${Math.min(100, placed.experience || 0)}%` }} />
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
                                className="scale-110 drop-shadow-2xl transition-transform duration-75"
                            >
                                {!dragPosition.isValid ? (
                                    <div className="absolute inset-0 bg-red-900/40 border-4 border-red-500/80 rounded-lg animate-pulse z-10 flex items-center justify-center">
                                        <span className="text-white font-bold text-2xl drop-shadow-md">❌</span>
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 bg-neutral-500/20 border-4 border-neutral-400/80 rounded-lg z-10 box-border" />
                                )}
                                <ItemIcon itemId={item.itemId} type={itemDef.type} experience={item.experience} />
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Harvest Toast */}
            {showHarvestToast && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-neutral-800 text-yellow-500 px-8 py-6 rounded-3xl shadow-2xl border border-neutral-700 animate-bounce-gentle z-50 flex flex-col items-center pointer-events-none scale-125">
                    <span className="text-6xl mb-2">🪙</span>
                    <span className="font-black text-3xl whitespace-nowrap drop-shadow-sm">+500 Coins!</span>
                </div>
            )}
        </div>
    );
};
