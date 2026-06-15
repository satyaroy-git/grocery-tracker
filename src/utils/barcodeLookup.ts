/**
 * Barcode product lookup using multiple free APIs:
 * 1. Open Food Facts (global, best coverage)
 * 2. UPC ItemDB (fallback)
 * 
 * If product not found in any database, returns null.
 * User can then add manually.
 */

export interface ProductInfo {
  name: string;
  brand: string;
  category: string;
  quantity: string;
  unit: string;
  imageUrl: string | null;
}

/**
 * Look up a product by barcode — tries multiple databases
 */
export async function lookupBarcode(barcode: string): Promise<ProductInfo | null> {
  // Try Open Food Facts first
  const offResult = await lookupOpenFoodFacts(barcode);
  if (offResult) return offResult;

  // Try UPC ItemDB as fallback
  const upcResult = await lookupUpcItemDb(barcode);
  if (upcResult) return upcResult;

  return null;
}

async function lookupOpenFoodFacts(barcode: string): Promise<ProductInfo | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { headers: { 'User-Agent': 'GroceryTracker/1.0' } }
    );

    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== 1 || !data.product) return null;

    const product = data.product;
    const { qty, unit } = parseProductQuantity(product.quantity || product.product_quantity || '');
    const category = mapToAppCategory(product.categories_tags || [], product.categories || '');

    const name = product.product_name || product.product_name_en || product.generic_name || '';
    if (!name) return null;

    return {
      name,
      brand: product.brands || '',
      category,
      quantity: qty,
      unit,
      imageUrl: product.image_front_small_url || product.image_url || null,
    };
  } catch (error) {
    return null;
  }
}

async function lookupUpcItemDb(barcode: string): Promise<ProductInfo | null> {
  try {
    const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.items || data.items.length === 0) return null;

    const item = data.items[0];
    const name = item.title || item.description || '';
    if (!name) return null;

    return {
      name,
      brand: item.brand || '',
      category: mapToAppCategory([], item.category || ''),
      quantity: '1',
      unit: 'pieces',
      imageUrl: item.images && item.images.length > 0 ? item.images[0] : null,
    };
  } catch (error) {
    return null;
  }
}

function parseProductQuantity(quantityStr: string): { qty: string; unit: string } {
  if (!quantityStr) return { qty: '1', unit: 'pieces' };

  const match = quantityStr.match(/(\d+\.?\d*)\s*(kg|g|ml|l|liters?|litres?|pieces?|pcs?|packets?)/i);
  if (match) {
    let unit = match[2].toLowerCase();
    if (unit === 'l' || unit.startsWith('liter') || unit.startsWith('litre')) unit = 'liters';
    else if (unit === 'g') unit = 'g';
    else if (unit === 'kg') unit = 'kg';
    else if (unit === 'ml') unit = 'ml';
    else unit = 'pieces';
    return { qty: match[1], unit };
  }

  return { qty: '1', unit: 'pieces' };
}

function mapToAppCategory(tags: string[], categoriesStr: string): string {
  const all = [...tags, ...categoriesStr.toLowerCase().split(',')].join(' ').toLowerCase();

  if (/dairy|milk|cheese|butter|yogurt|curd|paneer/i.test(all)) return 'Dairy';
  if (/cereal|grain|rice|wheat|flour|pasta|noodle|bread|atta/i.test(all)) return 'Grains & Cereals';
  if (/vegetable|onion|potato|tomato/i.test(all)) return 'Vegetables';
  if (/fruit|apple|banana|mango|orange/i.test(all)) return 'Fruits';
  if (/spice|condiment|sauce|salt|sugar|masala/i.test(all)) return 'Spices & Condiments';
  if (/beverage|drink|tea|coffee|juice|water/i.test(all)) return 'Beverages';
  if (/snack|chip|biscuit|cookie|chocolate/i.test(all)) return 'Snacks';
  if (/meat|poultry|chicken|fish|egg/i.test(all)) return 'Meat & Poultry';
  if (/oil|fat|ghee/i.test(all)) return 'Oils & Fats';
  if (/clean|detergent|soap|wash/i.test(all)) return 'Cleaning Supplies';
  if (/personal|shampoo|tooth/i.test(all)) return 'Personal Care';

  return 'Other';
}
