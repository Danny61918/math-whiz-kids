import React, { useRef, useState, useEffect } from 'react';
import { useGameStore, type PlacedItem } from '../store/useGameStore';
import { blockItems } from '../data/blockItems';
import { t } from '../utils/i18n';
import { BlockIcon } from './BlockIcon';
import { audioService } from '../services/audioService';

const GRID_CELL_SIZE = 50;
const CANVAS_COLS = 30; // 1500px wide
const CANVAS_ROWS = 20; // 1000px high
const CANVAS_WIDTH = CANVAS_COLS * GRID_CELL_SIZE;
const CANVAS_HEIGHT = CANVAS_ROWS * GRID_CELL_SIZE;

export const BlockWorldScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const { users, currentUserId, language, placeItem, moveItem } = useGameStore();
    const currentUser = currentUserId ? users[currentUserId] : null;

    // Dragging state
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(null);

    // Drag Mode Visualization
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState<{ x: number, y: number, w: number, h: number, isValid: boolean } | null>(null);

    if (!currentUser) return null;

    const inventory = Array.isArray(currentUser.inventory) ? {} : (currentUser.inventory || {});
    // Filter out old farm items that aren't in blockItems to prevent crashes
    const placedItems = (currentUser.placedItems || []).filter(item => blockItems.some(b => b.id === item.itemId));

    // Collision Check
    const checkCollision = (targetId: string | null, x: number, y: number, w: number, h: number) => {
        const targetRect = { left: x, right: x + w * GRID_CELL_SIZE, top: y, bottom: y + h * GRID_CELL_SIZE };

        for (const item of placedItems) {
            if (item.id === targetId) continue;

            const itemDef = blockItems.find(i => i.id === item.itemId);
            if (!itemDef) continue;

            const itemW = (itemDef.width || 1) * GRID_CELL_SIZE;
            const itemH = (itemDef.height || 1) * GRID_CELL_SIZE;
            const itemRect = { left: item.x, right: item.x + itemW, top: item.y, bottom: item.y + itemH };

            if (targetRect.left < itemRect.right &&
                targetRect.right > itemRect.left &&
                targetRect.top < itemRect.bottom &&
                targetRect.bottom > itemRect.top) {
                return true; 
            }
        }
        return false;
    };

    const handleDragStart = (item: PlacedItem) => {
        setDraggingId(item.id);
        setSelectedItem(null);
        setIsDragging(true);
        audioService.playPop(); // Add a grab sound
    };

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!draggingId || !canvasRef.current) return;

        if (e.cancelable) e.preventDefault();

        const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
        const rect = canvasRef.current.getBoundingClientRect();

        const movingItem = placedItems.find(i => i.id === draggingId);
        if (!movingItem) return;
        const blockItem = blockItems.find(i => i.id === movingItem.itemId);
        const itemW = blockItem?.width || 1;
        const itemH = blockItem?.height || 1;
        const widthPx = itemW * GRID_CELL_SIZE;
        const heightPx = itemH * GRID_CELL_SIZE;

        let centerX = clientX - rect.left;
        let centerY = clientY - rect.top;

        let x = centerX - (widthPx / 2);
        let y = centerY - (heightPx / 2);

        // Clamping
        x = Math.max(0, Math.min(x, CANVAS_WIDTH - widthPx));
        y = Math.max(0, Math.min(y, CANVAS_HEIGHT - heightPx));

        // Snapping
        const snapX = Math.round(x / GRID_CELL_SIZE) * GRID_CELL_SIZE;
        const snapY = Math.round(y / GRID_CELL_SIZE) * GRID_CELL_SIZE;

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
                audioService.playPop(); 
            } else {
                audioService.playIncorrect(); 
            }
        }
        setDraggingId(null);
        setIsDragging(false);
        setDragPosition(null);
    };

    useEffect(() => {
        if (draggingId) {
            window.addEventListener('mousemove', handleDragMove);
            window.addEventListener('mouseup', handleDragEnd);
            window.addEventListener('touchmove', handleDragMove, { passive: false });
            window.addEventListener('touchend', handleDragEnd);

            return () => {
                window.removeEventListener('mousemove', handleDragMove);
                window.removeEventListener('mouseup', handleDragEnd);
                window.removeEventListener('touchmove', handleDragMove);
                window.removeEventListener('touchend', handleDragEnd);
            };
        }
    }, [draggingId, dragPosition]);

    const handleItemClick = (e: React.MouseEvent, item: PlacedItem) => {
        e.stopPropagation();
        if (draggingId) return;
        setSelectedItem(item.id === selectedItem ? null : item.id);
    };

    const handlePlaceFromInventory = (itemId: string) => {
        const itemDef = blockItems.find(i => i.id === itemId);
        const w = itemDef?.width || 1;
        const h = itemDef?.height || 1;

        // Find a valid spot near the "ground" (bottom of canvas)
        let foundX = -1, foundY = -1;
        for (let r = CANVAS_ROWS - h; r >= 0; r--) {
            for (let c = Math.floor(CANVAS_COLS / 2) - 5; c <= CANVAS_COLS - w; c++) {
                // start search slightly off center
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
            audioService.playIncorrect();
            alert(language === 'zh-TW' ? '畫布已滿！請移動或收回一些積木。' : 'World is full! clear some space.');
        }
    };

    const handleClearAll = () => {
        const confirmMsg = language === 'zh-TW' ? '確定要收回所有積木到包包嗎？' : 'Clear all blocks back to inventory?';
        if (window.confirm(confirmMsg)) {
            const { removeAllPlacedItems } = useGameStore.getState();
            removeAllPlacedItems();
            audioService.playIncorrect(); 
        }
    };

    const handleRemoveItem = () => {
        if (selectedItem) {
            useGameStore.getState().removeItem(selectedItem);
            setSelectedItem(null);
            audioService.playPop();
        }
    };

    return (
        <div className="min-h-screen h-screen bg-[#1a1a2e] flex flex-col font-sans overflow-hidden">
            {/* Header (Top) */}
            <div className="p-3 border-b border-[#2a2a4a] flex justify-between items-center bg-[#151525] text-neutral-100 z-30 shrink-0 shadow-md">
                <button onClick={onBack} className="text-xl hover:scale-110 transition bg-white/10 px-4 py-1 rounded-full border border-white/20">🏠 {t('backHome', language)}</button>
                <div className="flex flex-col items-center">
                    <h2 className="font-bold text-lg text-[#4ade80]">{currentUser.name} {language === 'zh-TW' ? '的積木世界' : "'s Block World"}</h2>
                </div>
                <button
                    onClick={handleClearAll}
                    className="text-sm font-bold bg-red-900/50 text-red-200 px-4 py-1.5 rounded-full border border-red-700/50 hover:bg-red-800 transition"
                >
                    {language === 'zh-TW' ? '全部清空' : 'Clear All'}
                </button>
            </div>

            {/* Block World Canvas Scroll Area (Middle) */}
            <div className="flex-1 relative overflow-auto bg-[#1a1a2e] flex items-center justify-center p-4 lg:p-10 cursor-move"
                style={{
                    backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)',
                    backgroundSize: '50px 50px',
                    backgroundPosition: '0 0'
                }}
            >
                {/* Canvas Container */}
                <div
                    className="relative bg-neutral-900 overflow-hidden"
                    ref={canvasRef}
                    onClick={() => setSelectedItem(null)}
                    style={{
                        width: CANVAS_WIDTH,
                        height: CANVAS_HEIGHT,
                        flexShrink: 0,
                        borderBottom: '8px solid #475569', // Ground floor line
                        borderLeft: '4px solid #334155',
                        borderRight: '4px solid #334155',
                        borderTop: 'none',
                        boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                    }}
                >
                    {/* Atmospheric Gradient */}
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-neutral-800/20 to-transparent" />

                    {/* Placed Blocks */}
                    {placedItems.map(placed => {
                        const itemDef = blockItems.find(i => i.id === placed.itemId);
                        if (!itemDef) return null;

                        const zIndex = placed.y + (itemDef.type === 'plant' ? 1000 : 0);
                        const w = (itemDef.width || 1) * GRID_CELL_SIZE;
                        const h = (itemDef.height || 1) * GRID_CELL_SIZE;
                        const isBeingDragged = draggingId === placed.id;

                        if (isBeingDragged) return null;

                        return (
                            <div
                                key={placed.id}
                                onMouseDown={() => handleDragStart(placed)}
                                onTouchStart={() => handleDragStart(placed)}
                                onClick={(e) => handleItemClick(e, placed)}
                                style={{
                                    position: 'absolute',
                                    left: placed.x,
                                    top: placed.y,
                                    width: w,
                                    height: h,
                                    zIndex,
                                    cursor: 'grab',
                                    touchAction: 'none',
                                    userSelect: 'none',
                                    WebkitUserSelect: 'none'
                                }}
                                className={`group hover:brightness-110 relative ${selectedItem === placed.id ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-900 z-[9999]' : ''}`}
                            >
                                <BlockIcon itemId={placed.itemId} />

                                {/* Context Menu for Selected Block */}
                                {selectedItem === placed.id && (
                                    <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-neutral-800 px-3 py-1.5 rounded-lg shadow-xl text-sm font-bold z-50 flex gap-2 border border-neutral-600">
                                        <button 
                                            onClick={handleRemoveItem}
                                            className="text-red-400 hover:text-red-300"
                                        >
                                            {language === 'zh-TW' ? '回收' : 'Pickup'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Drag Preview */}
                    {isDragging && dragPosition && draggingId && (() => {
                        const item = placedItems.find(i => i.id === draggingId);
                        const itemDef = blockItems.find(i => i.id === item?.itemId);
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
                                    opacity: 0.8,
                                }}
                            >
                                {!dragPosition.isValid && (
                                    <div className="absolute inset-0 bg-red-900/60 border-2 border-red-500 rounded z-10 flex items-center justify-center">
                                        <span className="text-white font-bold text-2xl">❌</span>
                                    </div>
                                )}
                                <BlockIcon itemId={item.itemId} />
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Bottom Inventory Bar (Tablet Friendly) */}
            <div className="h-32 md:h-36 bg-[#151525] border-t-4 border-[#2a2a4a] flex shadow-[0_-10px_20px_rgba(0,0,0,0.3)] z-30 shrink-0 w-full overflow-x-auto overflow-y-hidden hide-scrollbar">
                <div className="flex items-center gap-3 p-3 px-6 mx-auto">
                    {blockItems.map(item => {
                        const count = inventory[item.id] || 0;
                        if (count === 0) return null;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handlePlaceFromInventory(item.id)}
                                className="flex flex-col items-center justify-center min-w-[80px] h-full rounded-2xl border-2 border-[#2a2a4a] bg-[#1a1a2e] hover:border-[#4ade80] hover:bg-[#20203a] transition active:scale-95 group relative shadow-inner"
                            >
                                <div className="w-12 h-12 mb-1 pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity flex justify-center items-center drop-shadow-md">
                                    <BlockIcon itemId={item.id} />
                                </div>
                                <span className="text-[11px] font-bold text-neutral-400 text-center leading-tight whitespace-nowrap overflow-hidden text-ellipsis w-full px-1">
                                    {t(item.nameKey as any, language) || item.nameKey}
                                </span>
                                <span className="absolute -top-2 -right-2 bg-[#4ade80] text-[#064e3b] text-xs font-black px-2 py-0.5 rounded-full border-2 border-[#151525] shadow-sm">x{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
