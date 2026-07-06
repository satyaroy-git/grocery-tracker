import { UNITS_OF_MEASUREMENT } from '../constants/categories';
import { safeCategoryGuess, guessUnitFromName } from '../utils/itemClassifier';

export interface BarcodeProductInfo {
  found: boolean;
  barcode: string;
  name?: string;
  brand?: string;
  category?: string;
  unit?: string;
  quantity?: number;
  imageUrl?: string;
  error?: string;
}

const VALID_UNIT_VALUES = new Set(UNITS_OF_MEASUREMENT.map((u) => u.value));

// Open Food Facts: a free, open, community-maintained product database
// covering barcodes from around the world, including a large and growing
// set of Indian grocery/FMCG products (Blinkit/Instamart/BigBasket-stocked
// brands included). No API key required.
// Docs: https://openfoodfacts.github.io/documentation/docs/Product-Opener/api/
//
// IMPORTANT: unlike the legacy v0 API (which returns HTTP 200 with a
// {status: 0} body for unknown barcodes), the v2 endpoint used here returns
// an HTTP 404 for barcodes it doesn't recognize. The original implementation
// only checked `response.ok` and treated any non-2xx as a generic network
// failure, so EVERY unrecognized barcode (which, for most Indian FMCG/kirana
// products not yet in the crowdsourced database, is common) was reported as
// "Lookup failed" instead of the friendlier, expected "Product not found -
// please fill in details manually". This is very likely why scanning felt
// broken - most real-world scans were silently hitting this branch.
const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v2/product';

/**
 * Look up a scanned barcode (EAN-13, EAN-8, UPC-A, UPC-E, etc.) against the
 * Open Food Facts database and return normalized product info suitable for
 * pre-filling the Add Item form.
 */
export async function lookupBarcode(barcode: string): Promise<BarcodeProductInfo> {
  try {
    const fields = [
      'product_name',
      'brands',
      'categories',
      'quantity',
      'product_quantity',
      'product_quantity_unit',
      'image_front_small_url',
    ].join(',');

    const response = await fetch(`${OFF_API_BASE}/${barcode}.json?fields=${fields}`, {
      headers: {
        // Open Food Facts asks API consumers to identify their app in the User-Agent.
        'User-Agent': 'PantryPal-GroceryTracker/1.0 (Expo React Native app)',
      },
    });

    // A 404 from this endpoint means "barcode not in database", not a real
    // network/server error - treat it the same as a not-found result rather
    // than surfacing it as a failure.
    if (response.status === 404) {
      return {
        found: false,
        barcode,
        error: "This product isn't in the Open Food Facts database yet. Please fill in the details manually below.",
      };
    }

    if (!response.ok) {
      return {
        found: false,
        barcode,
        error: `Lookup failed (status ${response.status}). You can still add this item manually.`,
      };
    }

    const data = await response.json();

    // Some non-404 responses can still carry status: 0 (e.g. malformed barcode) -
    // keep this check as a second safety net.
    if (data.status === 0 || !data.product) {
      return {
        found: false,
        barcode,
        error: 'Product not found in database. You can add it manually below.',
      };
    }

    const product = data.product;
    const name: string | undefined = product.product_name || undefined;
    const brand: string | undefined = product.brands ? product.brands.split(',')[0].trim() : undefined;

    // Map Open Food Facts' freeform category text to one of our fixed categories
    const category = guessCategoryFromOFF(product.categories || '', name || '');

    // Parse quantity like "500 g", "1 L", "6x200ml" into a best-effort number + unit
    const { quantity, unit } = parseQuantityString(
      product.product_quantity && product.product_quantity_unit
        ? `${product.product_quantity}${product.product_quantity_unit}`
        : product.quantity || ''
    );

    return {
      found: true,
      barcode,
      name,
      brand,
      category,
      // Fall back to a name-based unit guess if OFF didn't provide a parseable quantity/unit
      unit: unit || (name ? guessUnitFromName(name, quantity || 1) : undefined),
      quantity,
      imageUrl: product.image_front_small_url || undefined,
    };
  } catch (error: any) {
    return {
      found: false,
      barcode,
      error: `Network error while looking up product: ${error.message || 'Unknown error'}. You can add it manually.`,
    };
  }
}

function parseQuantityString(raw: string): { quantity?: number; unit?: string } {
  if (!raw) return {};

  const cleaned = raw.toLowerCase().replace(/\s+/g, '');
  // Match patterns like "500g", "1l", "1.5kg", "6x200ml" (take the per-unit size for the latter)
  const match = cleaned.match(/(\d+(?:\.\d+)?)\s*(kg|g|mg|l|ml|pcs|nos)/);
  if (!match) return {};

  const quantity = parseFloat(match[1]);
  let unit = match[2];
  if (unit === 'l') unit = 'L';
  if (unit === 'ml') unit = 'mL';

  if (!VALID_UNIT_VALUES.has(unit)) return { quantity };
  return { quantity, unit };
}

function guessCategoryFromOFF(offCategories: string, name: string): string {
  const text = `${offCategories} ${name}`.toLowerCase();

  if (/milk|curd|paneer|cheese|butter|yogurt|dairy/i.test(text)) return 'Dairy';
  if (/fruit|apple|banana|mango/i.test(text)) return 'Fruits';
  if (/vegetable|onion|potato|tomato/i.test(text)) return 'Vegetables';
  if (/rice|flour|atta|wheat|cereal-grain/i.test(text)) return 'Grains & Cereals';
  if (/dal|lentil|pulse/i.test(text)) return 'Pulses & Dals';
  if (/oil|ghee/i.test(text)) return 'Oils & Ghee';
  if (/biscuit|chip|snack|namkeen/i.test(text)) return 'Snacks';
  if (/tea|coffee/i.test(text)) return 'Tea & Coffee';
  if (/juice|soda|beverage|drink|water/i.test(text)) return 'Beverages';
  if (/sauce|ketchup|jam|spread|mayonnaise/i.test(text)) return 'Sauces & Spreads';
  if (/spice|masala|salt|sugar|condiment/i.test(text)) return 'Spices & Condiments';
  if (/meat|chicken|fish|seafood|egg/i.test(text)) return 'Meat & Seafood';
  if (/bread|bakery|cake|pastry/i.test(text)) return 'Bakery';
  if (/frozen|ice-cream/i.test(text)) return 'Frozen Foods';
  if (/nut|almond|cashew|dry-fruit/i.test(text)) return 'Dry Fruits & Nuts';
  if (/breakfast|cornflake|oats|muesli/i.test(text)) return 'Breakfast & Cereals';
  if (/chocolate|candy|sweet/i.test(text)) return 'Chocolates & Sweets';
  if (/baby|diaper/i.test(text)) return 'Baby Care';
  if (/vitamin|supplement|health|medicine/i.test(text)) return 'Health & Wellness';
  if (/soap|shampoo|toothpaste|cosmetic|personal-care/i.test(text)) return 'Personal Care';
  if (/detergent|clean|dishwash/i.test(text)) return 'Cleaning Supplies';
  if (/pet-food|pet-care/i.test(text)) return 'Pet Care';

  // Fall back to the shared name-based classifier (same one used by manual
  // entry and invoice scanning) before giving up and returning 'Other',
  // since OFF's categories field is sometimes empty/unhelpful even when the
  // product name itself is a clear match.
  return safeCategoryGuess(name);
}
