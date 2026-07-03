export interface ScannedProduct {
  barcode: string;
  name: string;
  category: string;
  unit: string;
  brand?: string;
}

export interface BarcodeResult {
  success: boolean;
  product?: ScannedProduct;
  error?: string;
  message?: string;
}

/**
 * Lookup product by barcode using 3-tier strategy:
 * 1. Supabase (local database)
 * 2. Open Food Facts API (global database)
 * 3. Suggest name search
 */
export const lookupProductByBarcode = async (barcode: string): Promise<BarcodeResult> => {
  try {
    if (!barcode || barcode.trim().length === 0) {
      return {
        success: false,
        error: 'Invalid barcode',
        message: 'Barcode cannot be empty',
      };
    }

    const cleanBarcode = barcode.trim().replace(/[^0-9]/g, '');

    if (cleanBarcode.length < 8) {
      return {
        success: false,
        error: 'Invalid barcode format',
        message: 'Barcode must be at least 8 digits',
      };
    }

    // Tier 1: Check Supabase (local database)
    console.log('[BarcodeService] Checking Supabase for barcode:', cleanBarcode);
    const supabaseResult = await lookupInSupabase(cleanBarcode);
    if (supabaseResult.success && supabaseResult.product) {
      return supabaseResult;
    }

    // Tier 2: Check Open Food Facts API (global database)
    console.log('[BarcodeService] Checking Open Food Facts for barcode:', cleanBarcode);
    const openFoodFactsResult = await lookupInOpenFoodFacts(cleanBarcode);
    if (openFoodFactsResult.success && openFoodFactsResult.product) {
      return openFoodFactsResult;
    }

    // Tier 3: Not found - suggest name search
    return {
      success: false,
      error: 'Product not found',
      message: `No product found for barcode: ${cleanBarcode}. Try searching by name.`,
    };
  } catch (error) {
    console.error('[BarcodeService] Barcode lookup error:', error);
    return {
      success: false,
      error: 'Lookup error',
      message: 'Failed to lookup product. Please try again.',
    };
  }
};

/**
 * Tier 1: Lookup product in Supabase (local Indian products)
 */
const lookupInSupabase = async (barcode: string): Promise<BarcodeResult> => {
  try {
    // Check if supabase is configured
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.log('[BarcodeService] Supabase not configured, skipping');
      return {
        success: false,
        error: 'Supabase not configured',
        message: 'Local database not available',
      };
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/products?barcode=eq.${barcode}`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Not found in Supabase',
        message: 'Product not in local database',
      };
    }

    const product = data[0];
    return {
      success: true,
      product: {
        barcode: product.barcode,
        name: product.name,
        category: product.category || 'Other',
        unit: product.unit || 'piece',
        brand: product.brand,
      },
      message: `Found in local database: ${product.name}`,
    };
  } catch (error) {
    console.error('[BarcodeService] Supabase lookup error:', error);
    return {
      success: false,
      error: 'Supabase error',
      message: 'Failed to query local database',
    };
  }
};

/**
 * Tier 2: Lookup product in Open Food Facts API (global database)
 */
const lookupInOpenFoodFacts = async (barcode: string): Promise<BarcodeResult> => {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );

    if (!response.ok) {
      return {
        success: false,
        error: 'API error',
        message: 'Failed to query Open Food Facts',
      };
    }

    const data = await response.json();

    if (!data.product || data.status === 0) {
      return {
        success: false,
        error: 'Product not found',
        message: 'Product not found in Open Food Facts database',
      };
    }

    const product: ScannedProduct = {
      barcode: data.product.code || barcode,
      name: data.product.product_name || 'Unknown Product',
      category: data.product.categories || 'Other',
      unit: data.product.quantity_unit || 'piece',
      brand: data.product.brands,
    };

    return {
      success: true,
      product,
      message: `Found in Open Food Facts: ${product.name}`,
    };
  } catch (error) {
    console.error('[BarcodeService] Open Food Facts lookup error:', error);
    return {
      success: false,
      error: 'API error',
      message: 'Failed to lookup in Open Food Facts',
    };
  }
};

/**
 * Search products by name (fallback when barcode not found)
 */
export const searchProductByName = async (name: string): Promise<BarcodeResult> => {
  try {
    if (!name || name.trim().length === 0) {
      return {
        success: false,
        error: 'Invalid search',
        message: 'Product name cannot be empty',
      };
    }

    const searchTerm = name.trim().toLowerCase();

    // Try Supabase first
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const response = await fetch(
          `${supabaseUrl}/rest/v1/products?name=ilike.%${searchTerm}%&limit=1`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const product = data[0];
            return {
              success: true,
              product: {
                barcode: product.barcode,
                name: product.name,
                category: product.category || 'Other',
                unit: product.unit || 'piece',
                brand: product.brand,
              },
              message: `Found: ${product.name}`,
            };
          }
        }
      } catch (error) {
        console.error('[BarcodeService] Supabase name search error:', error);
      }
    }

    // Try Open Food Facts
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(searchTerm)}&json=1`
      );
      const data = await response.json();

      if (data.products && data.products.length > 0) {
        const firstProduct = data.products[0];
        const product: ScannedProduct = {
          barcode: firstProduct.code || '',
          name: firstProduct.product_name || 'Unknown',
          category: firstProduct.categories || 'Other',
          unit: firstProduct.quantity_unit || 'piece',
          brand: firstProduct.brands,
        };

        return {
          success: true,
          product,
          message: `Found: ${product.name}`,
        };
      }
    } catch (error) {
      console.error('[BarcodeService] Open Food Facts search error:', error);
    }

    return {
      success: false,
      error: 'Product not found',
      message: `No product found matching: ${name}`,
    };
  } catch (error) {
    console.error('[BarcodeService] Product search error:', error);
    return {
      success: false,
      error: 'Search error',
      message: 'Failed to search products',
    };
  }
};

/**
 * Validate barcode format
 */
export const isValidBarcode = (barcode: string): boolean => {
  const cleanBarcode = barcode.replace(/[^0-9]/g, '');
  // Support EAN-13 (13 digits), UPC-A (12 digits), EAN-8 (8 digits)
  return [8, 12, 13].includes(cleanBarcode.length);
};
