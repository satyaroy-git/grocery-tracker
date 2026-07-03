# Quick Start Guide - Barcode Scanning

## 30-Second Setup

### 1. Create Supabase Project (2 min)
Go to https://supabase.com, sign up, create project, copy credentials

### 2. Configure Environment (1 min)
```bash
echo 'EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co' > .env
echo 'EXPO_PUBLIC_SUPABASE_ANON_KEY=your-key' >> .env
```

### 3. Create Database (1 min)
In Supabase SQL Editor:
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_barcode ON products(barcode);
```

### 4. Add Test Data (1 min)
```sql
INSERT INTO products (barcode, name, category, unit, brand, price) VALUES
('8901030100220', 'Aashirvaad Atta', 'Grains & Flour', 'kg', 'Aashirvaad', 45),
('8901030100237', 'Aashirvaad Wheat Atta', 'Grains & Flour', 'kg', 'Aashirvaad', 50),
('8901030100244', 'Aashirvaad Maida', 'Grains & Flour', 'kg', 'Aashirvaad', 40),
('8901030100251', 'Aashirvaad Besan', 'Grains & Flour', 'kg', 'Aashirvaad', 55),
('8901030100268', 'Aashirvaad Rice', 'Grains & Flour', 'kg', 'Aashirvaad', 60);
```

### 5. Install & Run (1 min)
```bash
npm install
expo start
```

## Test It

1. Open app → "Add Item" → "Scan Barcode"
2. Click "Manual Entry"
3. Type: `8901030100220`
4. Click "Search"
5. ✅ Should find "Aashirvaad Atta"

## Key Features

✅ Real-time barcode scanning
✅ Supabase integration
✅ Indian product database
✅ Manual entry fallback
✅ Name-based search
✅ Auto-fill product details
✅ Error handling
✅ Camera permission handling
