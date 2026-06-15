/**
 * Barcode product lookup using Open Food Facts API (free, no API key needed)
 * Covers most grocery products worldwide including Indian brands.
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
 * Look up a product by its barcode using Open Food Facts
 */
export async function lookupBarcode(barcode: string): Promise<ProductInfo | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      { headers: { 'User-Agent': 'GroceryTracker/1.0' } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 1 || !data.product) return null;

    const product = data.product;

    // Extract quantity and unit from product
    const { qty, unit } = parseProductQuantity(product.quantity || product.product_quantity || '');

    // Determine category
    const category = mapToAppCategory(
      product.categories_tags || [],
      product.categories || ''
    );

    return {
      name: product.product_name || product.generic_name || 'Unknown Product',
      brand: product.brands || '',
      category,
      quantity: qty,
      unit,
      imageUrl: product.image_front_small_url || product.image_url || null,
    };
  } catch (error) {
    console.error('Barcode lookup failed:', error);
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

  if (/dairy|milk|cheese|butter|yogurt|curd/i.test(all)) return 'Dairy';
  if (/cereal|grain|rice|wheat|flour|pasta|noodle|bread/i.test(all)) return 'Grains & Cereals';
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
