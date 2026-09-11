export const PACKING_STORAGE_KEY = 'europe-guide-packing-v1';

export const PACKING_CATEGORIES = [
  'Documents', 'Money', 'Electronics', 'Clothing', 'Winter',
  'Toiletries', 'Medicine / Emergency', 'Gym', 'Flight', 'Daily Bag',
] as const;

export type PackingCategory = (typeof PACKING_CATEGORIES)[number];
export type PackingItem = {
  id: string;
  label: string;
  category: PackingCategory;
  packed: boolean;
  critical: boolean;
  custom?: boolean;
};

const defaults: Array<[PackingCategory, string, boolean?]> = [
  ['Documents', 'Passport', true], ['Documents', 'Visa documents'],
  ['Documents', 'Travel insurance', true], ['Documents', 'Flight information'],
  ['Documents', 'Hotel confirmations'], ['Documents', 'Train tickets'],
  ['Money', 'Wallet', true], ['Money', 'Two payment cards'],
  ['Money', 'EUR cash'], ['Money', 'Emergency cash'],
  ['Electronics', 'Phone', true], ['Electronics', 'Power bank'],
  ['Electronics', 'USB-C cable'], ['Electronics', 'EU adapter'],
  ['Electronics', 'Camera'], ['Electronics', 'Camera batteries'],
  ['Electronics', 'Headphones'],
  ['Clothing', 'Underwear and socks'], ['Clothing', 'Walking trousers'],
  ['Clothing', 'Everyday tops'], ['Clothing', 'Sleepwear'],
  ['Clothing', 'Walking shoes'], ['Clothing', 'Laundry bag'],
  ['Winter', 'Winter jacket'], ['Winter', 'Thermal layers'],
  ['Winter', 'Gloves'], ['Winter', 'Scarf'], ['Winter', 'Compact umbrella'],
  ['Toiletries', 'Toothbrush and toothpaste'], ['Toiletries', 'Skincare basics'],
  ['Toiletries', 'Deodorant'], ['Toiletries', 'Travel-size liquids bag'],
  ['Medicine / Emergency', 'Essential medication', true],
  ['Medicine / Emergency', 'Prescription or medication copy'],
  ['Medicine / Emergency', 'Pain relief'],
  ['Medicine / Emergency', 'Cold and stomach medicine'],
  ['Medicine / Emergency', 'Bandages and blister care'],
  ['Gym', 'Training shoes'], ['Gym', 'Gym clothes'],
  ['Gym', 'Lifting straps'], ['Gym', 'Small gym towel'],
  ['Flight', 'Neck pillow'], ['Flight', 'Compression socks'],
  ['Flight', 'Luggage scale'],
  ['Daily Bag', 'Passport copy'], ['Daily Bag', 'Water bottle'],
  ['Daily Bag', 'Tissues and wet wipes'], ['Daily Bag', 'Reusable tote'],
];

export const DEFAULT_PACKING_ITEMS: PackingItem[] = defaults.map(
  ([category, label, critical = false], index) => ({
    id: `pack-${String(index + 1).padStart(2, '0')}`,
    label,
    category,
    packed: false,
    critical,
  }),
);

export const packingSummary = (items: PackingItem[]) => ({
  total: items.length,
  packed: items.filter((item) => item.packed).length,
  criticalRemaining: items.filter((item) => item.critical && !item.packed).length,
});

export const updatePackingItem = (
  items: PackingItem[], id: string, patch: Partial<Omit<PackingItem, 'id'>>,
) => items.map((item) => item.id === id ? { ...item, ...patch } : item);

export const addPackingItem = (
  items: PackingItem[], label: string, category: PackingCategory, critical = false,
) => [...items, {
  id: `pack-custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: label.trim(), category, critical, packed: false, custom: true,
}];

