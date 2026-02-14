export type ItemType = 'building' | 'plant' | 'animal';

export interface ShopItem {
    id: string;
    nameKey: string; // Key for i18n
    price: number;
    type: ItemType;
    width?: number; // Width in grid cells (default 1)
    height?: number; // Height in grid cells (default 1)
    growthStages?: string[]; // Deprecated, logic moved to ItemIcon
}

export const shopItems: ShopItem[] = [
    // Special
    { id: 'land_expansion', nameKey: 'itemLandExpansion', price: 1000, type: 'building' },
    { id: 'farm_plot', nameKey: 'itemFarmPlot', price: 100, type: 'building', width: 1, height: 1 },

    // Buildings
    { id: 'cabin', nameKey: 'itemCabin', price: 500, type: 'building', width: 2, height: 2 },
    { id: 'barn', nameKey: 'itemBarn', price: 800, type: 'building', width: 3, height: 2 },
    { id: 'fence', nameKey: 'itemFence', price: 50, type: 'building', width: 1, height: 1 },
    { id: 'fountain', nameKey: 'itemFountain', price: 1200, type: 'building', width: 2, height: 2 },
    { id: 'windmill', nameKey: 'itemWindmill', price: 1500, type: 'building', width: 2, height: 3 },
    { id: 'cottage', nameKey: 'itemCottage', price: 2000, type: 'building', width: 3, height: 2 },
    { id: 'tent', nameKey: 'itemTent', price: 300, type: 'building', width: 2, height: 2 },
    { id: 'castle', nameKey: 'itemCastle', price: 5000, type: 'building', width: 4, height: 3 },

    // Plants (Default 1x1 unless specified)
    { id: 'tree_apple', nameKey: 'itemAppleTree', price: 200, type: 'plant', width: 2, height: 2 },
    { id: 'tree_oak', nameKey: 'itemOak', price: 250, type: 'plant', width: 2, height: 2 },
    { id: 'sunflower', nameKey: 'itemSunflower', price: 100, type: 'plant' },
    { id: 'grass', nameKey: 'itemGrass', price: 20, type: 'plant' },
    { id: 'rose', nameKey: 'itemRose', price: 150, type: 'plant' },
    { id: 'corn', nameKey: 'itemCorn', price: 120, type: 'plant' },
    { id: 'pine', nameKey: 'itemPine', price: 300, type: 'plant', width: 1, height: 2 },
    { id: 'cactus', nameKey: 'itemCactus', price: 180, type: 'plant' },
    { id: 'mushroom', nameKey: 'itemMushroom', price: 80, type: 'plant' },

    // Animals (Usually 1x1 for now, or 1x1 visual but effective 1x1)
    { id: 'chick', nameKey: 'itemChick', price: 150, type: 'animal' },
    { id: 'dog', nameKey: 'itemDog', price: 300, type: 'animal' },
    { id: 'cow', nameKey: 'itemCow', price: 500, type: 'animal', width: 2, height: 1 },
    { id: 'pig', nameKey: 'itemPig', price: 400, type: 'animal' },
    { id: 'rabbit', nameKey: 'itemRabbit', price: 200, type: 'animal' },
    { id: 'sheep', nameKey: 'itemSheep', price: 350, type: 'animal' },
    { id: 'cat', nameKey: 'itemCat', price: 250, type: 'animal' },
];
