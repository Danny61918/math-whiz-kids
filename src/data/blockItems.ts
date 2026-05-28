export type BlockType = 'block' | 'decor' | 'plant';

export interface BlockItem {
    id: string;
    nameKey: string; // Key for i18n
    price: number;
    type: BlockType;
    color?: string; // Solid color for rendering basic blocks
    width?: number; // Width in grid cells (default 1)
    height?: number; // Height in grid cells (default 1)
}

export const blockItems: BlockItem[] = [
    // --- Solid Color Blocks (Prices are cheap to encourage building) ---
    { id: 'block_red', nameKey: 'itemBlockRed', price: 5, type: 'block', color: '#EF4444' },
    { id: 'block_orange', nameKey: 'itemBlockOrange', price: 5, type: 'block', color: '#F97316' },
    { id: 'block_yellow', nameKey: 'itemBlockYellow', price: 5, type: 'block', color: '#EAB308' },
    { id: 'block_green', nameKey: 'itemBlockGreen', price: 5, type: 'block', color: '#22C55E' },
    { id: 'block_teal', nameKey: 'itemBlockTeal', price: 5, type: 'block', color: '#14B8A6' },
    { id: 'block_blue', nameKey: 'itemBlockBlue', price: 5, type: 'block', color: '#3B82F6' },
    { id: 'block_purple', nameKey: 'itemBlockPurple', price: 5, type: 'block', color: '#A855F7' },
    { id: 'block_pink', nameKey: 'itemBlockPink', price: 5, type: 'block', color: '#EC4899' },
    { id: 'block_white', nameKey: 'itemBlockWhite', price: 5, type: 'block', color: '#F8FAFC' },
    { id: 'block_gray', nameKey: 'itemBlockGray', price: 5, type: 'block', color: '#64748B' },
    { id: 'block_black', nameKey: 'itemBlockBlack', price: 5, type: 'block', color: '#0F172A' },
    
    // --- Special Material Blocks ---
    { id: 'block_wood', nameKey: 'itemBlockWood', price: 10, type: 'block', color: '#92400E' },
    { id: 'block_stone', nameKey: 'itemBlockStone', price: 10, type: 'block', color: '#475569' },
    { id: 'block_glass', nameKey: 'itemBlockGlass', price: 15, type: 'block', color: '#BAE6FD' }, // Will render with opacity in SVG

    // --- Decorations / Devices ---
    { id: 'decor_door', nameKey: 'itemDecorDoor', price: 20, type: 'decor', width: 1, height: 2 },
    { id: 'decor_window', nameKey: 'itemDecorWindow', price: 20, type: 'decor', width: 2, height: 2 },
    { id: 'decor_roof_red', nameKey: 'itemDecorRoofRed', price: 15, type: 'decor', width: 2, height: 1 },
    { id: 'decor_roof_blue', nameKey: 'itemDecorRoofBlue', price: 15, type: 'decor', width: 2, height: 1 },
    { id: 'decor_chimney', nameKey: 'itemDecorChimney', price: 30, type: 'decor', width: 1, height: 2 },
    { id: 'decor_lamp', nameKey: 'itemDecorLamp', price: 40, type: 'decor', width: 1, height: 2 },

    // --- Plants & Landscaping ---
    { id: 'plant_grass', nameKey: 'itemPlantGrass', price: 5, type: 'plant', width: 1, height: 1 },
    { id: 'plant_flower_red', nameKey: 'itemPlantFlowerRed', price: 10, type: 'plant', width: 1, height: 1 },
    { id: 'plant_flower_blue', nameKey: 'itemPlantFlowerBlue', price: 10, type: 'plant', width: 1, height: 1 },
    { id: 'plant_bush', nameKey: 'itemPlantBush', price: 20, type: 'plant', width: 2, height: 1 },
    { id: 'plant_tree', nameKey: 'itemPlantTree', price: 80, type: 'plant', width: 3, height: 4 },
];
