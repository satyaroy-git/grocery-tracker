import { supabase } from '../config/supabase';

export interface ScannedProduct {
  barcode: string;
  name: string;
  category: string;
  unit: string;
  brand?: string;
  imageUrl?: string;
  price?: number;
}

export interface BarcodeResult {
  success: boolean;
  product?: ScannedProduct;
  error?: string;
  message?: string;
}

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

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('barcode', cleanBarcode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Product not found',
          message: `No product found for barcode: ${cleanBarcode}`,
        };
      }
      throw error;
    }

    if (!data) {
      return {
        success: false,
        error: 'Product not found',
        message: `No product found for barcode: ${cleanBarcode}`,
      };
    }

    const product: ScannedProduct = {
      barcode: data.barcode,
      name: data.name,
      category: data.category || 'Other',
      unit: data.unit || 'piece',
      brand: data.brand,
      imageUrl: data.image_url,
      price: data.price,
    };

    return {
      success: true,
      product,
      message: `Found: ${product.name}`,
    };
  } catch (error) {
    console.error('Barcode lookup error:', error);
    return {
      success: false,
      error: 'Database error',
      message: 'Failed to lookup product. Please try again.',
    };
  }
};

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

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .ilike('name', `%${searchTerm}%`)
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          success: false,
          error: 'Product not found',
          message: `No product found matching: ${name}`,
        };
      }
      throw error;
    }

    if (!data) {
      return {
        success: false,
        error: 'Product not found',
        message: `No product found matching: ${name}`,
      };
    }

    const product: ScannedProduct = {
      barcode: data.barcode,
      name: data.name,
      category: data.category || 'Other',
      unit: data.unit || 'piece',
      brand: data.brand,
      imageUrl: data.image_url,
      price: data.price,
    };

    return {
      success: true,
      product,
      message: `Found: ${product.name}`,
    };
  } catch (error) {
    console.error('Product search error:', error);
    return {
      success: false,
      error: 'Search error',
      message: 'Failed to search products. Please try again.',
    };
  }
};

export const getProductsByCategory = async (category: string) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', category)
      .limit(50);

    if (error) throw error;

    return {
      success: true,
      products: data || [],
    };
  } catch (error) {
    console.error('Category search error:', error);
    return {
      success: false,
      products: [],
      error: 'Failed to fetch products',
    };
  }
};

export const isValidBarcode = (barcode: string): boolean => {
  const cleanBarcode = barcode.replace(/[^0-9]/g, '');
  return [8, 12, 13].includes(cleanBarcode.length);
};