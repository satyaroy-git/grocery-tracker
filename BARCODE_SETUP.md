# Barcode Scanning Setup Guide for PantryPal

## Overview

This guide explains how to set up barcode scanning functionality with Supabase integration for Indian products in your PantryPal app.

## Prerequisites

1. **Supabase Account**: Create a free account at [supabase.com](https://supabase.com)
2. **Expo Project**: Your React Native app using Expo
3. **Dependencies**: Already included in the implementation

## Step 1: Set Up Supabase

### 1.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Fill in project details:
   - **Name**: `pantrypal-products` (or your choice)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to your users (e.g., `ap-south-1` for India)
4. Click "Create new project" and wait for initialization

### 1.2 Create the Products Table

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Paste the following SQL:

```sql
CREATE TABLE products (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  barcode VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  unit VARCHAR(50),
  brand VARCHAR(100),
  price DECIMAL(10, 2),
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster barcode lookups
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);
```

4. Click **Run**

### 1.3 Enable Row Level Security (RLS)

1. Go to **Authentication** > **Policies**
2. Click on the `products` table
3. Click **New Policy**
4. Select **For SELECT** (allow public read access)
5. Click **Create**

## Step 2: Configure Environment Variables

### 2.1 Get Supabase Credentials

1. In Supabase dashboard, go to **Settings** > **API**
2. Copy:
   - **Project URL** (SUPABASE_URL)
   - **anon public** key (SUPABASE_ANON_KEY)

### 2.2 Add to Your .env File

Create or update `.env` file in your project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Use `EXPO_PUBLIC_` prefix for Expo to expose these variables to the client.

## Step 3: Install Required Dependencies

```bash
npm install @supabase/supabase-js expo-barcode-scanner
# or
yarn add @supabase/supabase-js expo-barcode-scanner
```

## Step 4: Populate Indian Products Database

### 4.1 Using the Provided Data

The app includes a starter dataset of 80+ Indian products in `src/data/indianProducts.ts`. To load these into Supabase:

1. Create a script file `scripts/seedProducts.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { INDIAN_PRODUCTS } from '../src/data/indianProducts';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedProducts() {
  try {
    const { error } = await supabase
      .from('products')
      .insert(INDIAN_PRODUCTS);

    if (error) throw error;
    console.log(`Successfully inserted ${INDIAN_PRODUCTS.length} products`);
  } catch (error) {
    console.error('Error seeding products:', error);
  }
}

seedProducts();
```

2. Run the script:

```bash
ts-node scripts/seedProducts.ts
```

### 4.2 Manual Data Entry

Alternatively, use Supabase's web interface:

1. Go to **Table Editor**
2. Click on `products` table
3. Click **Insert row**
4. Fill in the fields:
   - **barcode**: 13-digit EAN code (e.g., `8901030100220`)
   - **name**: Product name (e.g., `Aashirvaad Atta`)
   - **category**: Category (e.g., `Grains & Flour`)
   - **unit**: Unit (e.g., `kg`, `liter`, `piece`)
   - **brand**: Brand name (optional)
   - **price**: Price in INR (optional)
   - **image_url**: Product image URL (optional)

### 4.3 Bulk Import from CSV

1. Prepare a CSV file with columns: `barcode,name,category,unit,brand,price,image_url`
2. In Supabase, go to **Table Editor** > `products`
3. Click **Import data** > **CSV**
4. Upload your file

## Step 5: Update Navigation Configuration

Add the BarcodeScanner route to your navigation stack. In your navigation file:

```typescript
import BarcodeScannerScreen from '../screens/BarcodeScannerScreen';

// In your stack navigator:
<Stack.Screen
  name="BarcodeScanner"
  component={BarcodeScannerScreen}
  options={{ headerShown: false }}
/>
```

## Step 6: Request Camera Permissions

Update your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-barcode-scanner",
        {
          "cameraPermission": "Allow PantryPal to access your camera to scan barcodes."
        }
      ]
    ]
  }
}
```

## Step 7: Test the Implementation

1. Run your app:
   ```bash
   expo start
   ```

2. Navigate to AddItemScreen
3. Click "Scan Barcode" button
4. Grant camera permission
5. Point camera at a barcode
6. The app should:
   - Scan the barcode
   - Look it up in Supabase
   - Auto-fill product details
   - Show success message

## Troubleshooting

### "Product not found" errors

**Issue**: Scanned barcodes aren't found in the database

**Solutions**:
1. Verify barcode is in the database (check Supabase table)
2. Ensure barcode format is correct (8, 12, or 13 digits)
3. Check for leading zeros in barcode
4. Use manual entry to search by product name

### Camera permission denied

**Issue**: Camera permission not granted

**Solutions**:
1. Check app permissions in device settings
2. Reinstall the app
3. Clear app cache and data
4. Ensure `app.json` has camera permission configured

### Supabase connection errors

**Issue**: "Failed to lookup product" error

**Solutions**:
1. Verify `.env` variables are set correctly
2. Check Supabase project is active
3. Verify RLS policies allow public read access
4. Check network connectivity
5. Review Supabase logs for errors

### Slow barcode lookups

**Issue**: Product lookup takes too long

**Solutions**:
1. Ensure indexes are created on `barcode` and `name` columns
2. Optimize Supabase query performance
3. Consider caching frequently scanned products locally
4. Use pagination for large datasets

## Adding More Products

### Indian Product Databases

You can expand the product database using these sources:

1. **GS1 India**: Official barcode registry
   - Website: [gs1india.org](https://gs1india.org)
   - Provides authentic barcode data

2. **Open Food Facts**: Community-driven database
   - Website: [openfoodfacts.org](https://openfoodfacts.org)
   - API available for bulk imports

3. **Retail APIs**: Partner with retailers
   - Amazon Product API
   - Flipkart API
   - Local grocery store APIs

### Import Script Example

```typescript
// scripts/importFromOpenFoodFacts.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function importProducts(barcodes: string[]) {
  for (const barcode of barcodes) {
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await response.json();

      if (data.product) {
        const { error } = await supabase.from('products').insert({
          barcode,
          name: data.product.product_name,
          category: data.product.categories,
          brand: data.product.brands,
          image_url: data.product.image_url,
        });

        if (!error) console.log(`Imported: ${data.product.product_name}`);
      }
    } catch (error) {
      console.error(`Failed to import ${barcode}:`, error);
    }
  }
}
```

## Performance Optimization

### 1. Local Caching

Cache recently scanned products locally:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const cacheProduct = async (product: ScannedProduct) => {
  const cached = await AsyncStorage.getItem('scanned_products');
  const products = cached ? JSON.parse(cached) : [];
  products.push(product);
  await AsyncStorage.setItem('scanned_products', JSON.stringify(products));
};
```

### 2. Batch Lookups

For multiple barcodes, use batch queries:

```typescript
const lookupMultipleProducts = async (barcodes: string[]) => {
  const { data } = await supabase
    .from('products')
    .select('*')
    .in('barcode', barcodes);
  return data;
};
```

### 3. Pagination

For large result sets:

```typescript
const getProductsByCategory = async (category: string, page = 1) => {
  const pageSize = 20;
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('category', category)
    .range((page - 1) * pageSize, page * pageSize - 1);
  return data;
};
```

## Security Considerations

1. **RLS Policies**: Only allow public read access, restrict writes
2. **API Keys**: Never commit `.env` files with real keys
3. **Rate Limiting**: Implement rate limiting for API calls
4. **Data Validation**: Validate all barcode inputs
5. **HTTPS Only**: Ensure all Supabase connections use HTTPS

## Next Steps

1. Test barcode scanning with real products
2. Expand product database with more Indian products
3. Implement product image caching
4. Add product reviews/ratings
5. Create admin panel for product management
6. Set up automated product updates from external sources

## Support

For issues or questions:
1. Check Supabase documentation: [supabase.com/docs](https://supabase.com/docs)
2. Review barcode scanner docs: [expo.dev/barcode-scanner](https://docs.expo.dev/versions/latest/sdk/bar-code-scanner/)
3. Check app logs for detailed error messages
4. Test with sample barcodes from the included dataset
