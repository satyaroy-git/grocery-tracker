import * as SQLite from 'expo-sqlite';

// Types
export type ConsumptionMode = 'manual' | 'auto';
export type ConsumptionFrequency = 'daily' | 'weekly' | 'monthly';
export type ItemStatus = 'ok' | 'low' | 'empty';
export type AlertFrequency = 'daily' | 'every_2_days' | 'weekly' | 'never';

export interface GroceryItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  currentQuantity: number;
  threshold: number;
  consumptionMode: ConsumptionMode;
  autoConsumptionRate: number | null;
  autoConsumptionFrequency: ConsumptionFrequency | null;
  // Both optional/nullable - price and expiry are not required to add an item
  price: number | null;
  expiryDate: string | null; // ISO date string, e.g. '2026-08-15'
  createdAt: string;
  updatedAt: string;
}

export interface GroceryItemWithStatus extends GroceryItem {
  status: ItemStatus;
  daysUntilEmpty: number | null;
  daysUntilExpiry: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean; // within 3 days
}

export interface ShoppingListItem {
  id: number;
  name: string;
  quantityNeeded: number;
  unit: string;
  category: string;
  isPurchased: boolean;
  itemId: number | null;
  createdAt: string;
}

export interface ConsumptionLog {
  id: number;
  itemId: number;
  quantity: number;
  type: 'manual' | 'auto' | 'restock';
  note: string | null;
  createdAt: string;
}

export interface AppSettings {
  defaultConsumptionMode: ConsumptionMode;
  alertFrequency: AlertFrequency;
  onboardingComplete: boolean;
}

export interface CreateItemInput {
  name: string;
  category: string;
  unit: string;
  currentQuantity: number;
  threshold: number;
  consumptionMode: ConsumptionMode;
  autoConsumptionRate: number | null;
  autoConsumptionFrequency: ConsumptionFrequency | null;
  // Optional fields - safe to omit entirely when creating an item
  price?: number | null;
  expiryDate?: string | null;
}

// Database instance
let db: SQLite.SQLiteDatabase;

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('pantrypal.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      currentQuantity REAL NOT NULL DEFAULT 0,
      threshold REAL NOT NULL DEFAULT 0,
      consumptionMode TEXT NOT NULL DEFAULT 'manual',
      autoConsumptionRate REAL,
      autoConsumptionFrequency TEXT,
      price REAL,
      expiryDate TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS consumption_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      itemId INTEGER NOT NULL,
      quantity REAL NOT NULL,
      type TEXT NOT NULL DEFAULT 'manual',
      note TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shopping_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantityNeeded REAL NOT NULL DEFAULT 1,
      unit TEXT NOT NULL,
      category TEXT NOT NULL,
      isPurchased INTEGER NOT NULL DEFAULT 0,
      itemId INTEGER,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('defaultConsumptionMode', 'manual');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('alertFrequency', 'daily');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('onboardingComplete', 'false');
  `);

  await migrateSchema();
}

// Safe migration: adds price/expiryDate columns to installs that already have
// an `items` table from before these fields existed. CREATE TABLE IF NOT EXISTS
// above only applies to brand-new databases, so existing users need this to
// pick up the new columns without losing their data.
async function migrateSchema(): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(items)`);
  const columnNames = new Set(columns.map((c) => c.name));

  if (!columnNames.has('price')) {
    await db.execAsync(`ALTER TABLE items ADD COLUMN price REAL;`);
  }
  if (!columnNames.has('expiryDate')) {
    await db.execAsync(`ALTER TABLE items ADD COLUMN expiryDate TEXT;`);
  }
}

// Helper to compute status
function computeStatus(item: GroceryItem): GroceryItemWithStatus {
  let status: ItemStatus = 'ok';
  if (item.currentQuantity <= 0) {
    status = 'empty';
  } else if (item.currentQuantity <= item.threshold) {
    status = 'low';
  }

  let daysUntilEmpty: number | null = null;
  if (item.consumptionMode === 'auto' && item.autoConsumptionRate && item.autoConsumptionRate > 0) {
    let dailyRate = item.autoConsumptionRate;
    if (item.autoConsumptionFrequency === 'weekly') {
      dailyRate = item.autoConsumptionRate / 7;
    } else if (item.autoConsumptionFrequency === 'monthly') {
      dailyRate = item.autoConsumptionRate / 30;
    }
    daysUntilEmpty = dailyRate > 0 ? Math.floor(item.currentQuantity / dailyRate) : null;
  }

  // Expiry is entirely optional - all of these stay null/false when expiryDate isn't set
  let daysUntilExpiry: number | null = null;
  let isExpired = false;
  let isExpiringSoon = false;
  if (item.expiryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(item.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffMs = expiry.getTime() - today.getTime();
    daysUntilExpiry = Math.round(diffMs / (1000 * 60 * 60 * 24));
    isExpired = daysUntilExpiry < 0;
    isExpiringSoon = daysUntilExpiry >= 0 && daysUntilExpiry <= 3;
  }

  return { ...item, status, daysUntilEmpty, daysUntilExpiry, isExpired, isExpiringSoon };
}

// CRUD Operations
export async function createItem(input: CreateItemInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO items (name, category, unit, currentQuantity, threshold, consumptionMode, autoConsumptionRate, autoConsumptionFrequency, price, expiryDate)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.category,
      input.unit,
      input.currentQuantity,
      input.threshold,
      input.consumptionMode,
      input.autoConsumptionRate,
      input.autoConsumptionFrequency,
      input.price ?? null,
      input.expiryDate ?? null,
    ]
  );
  return result.lastInsertRowId;
}

export async function createItemsBatch(items: CreateItemInput[]): Promise<number[]> {
  const ids: number[] = [];
  for (const item of items) {
    const id = await createItem(item);
    ids.push(id);
  }
  return ids;
}

export async function updateItem(id: number, input: Partial<CreateItemInput>): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];

  if (input.name !== undefined) { fields.push('name = ?'); values.push(input.name); }
  if (input.category !== undefined) { fields.push('category = ?'); values.push(input.category); }
  if (input.unit !== undefined) { fields.push('unit = ?'); values.push(input.unit); }
  if (input.currentQuantity !== undefined) { fields.push('currentQuantity = ?'); values.push(input.currentQuantity); }
  if (input.threshold !== undefined) { fields.push('threshold = ?'); values.push(input.threshold); }
  if (input.consumptionMode !== undefined) { fields.push('consumptionMode = ?'); values.push(input.consumptionMode); }
  if (input.autoConsumptionRate !== undefined) { fields.push('autoConsumptionRate = ?'); values.push(input.autoConsumptionRate); }
  if (input.autoConsumptionFrequency !== undefined) { fields.push('autoConsumptionFrequency = ?'); values.push(input.autoConsumptionFrequency); }
  if (input.price !== undefined) { fields.push('price = ?'); values.push(input.price); }
  if (input.expiryDate !== undefined) { fields.push('expiryDate = ?'); values.push(input.expiryDate); }

  if (fields.length === 0) return;

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  await db.runAsync(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteItem(id: number): Promise<void> {
  await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
}

export async function getItemById(id: number): Promise<GroceryItemWithStatus | null> {
  const item = await db.getFirstAsync<GroceryItem>('SELECT * FROM items WHERE id = ?', [id]);
  if (!item) return null;
  return computeStatus(item);
}

export async function getAllItems(): Promise<GroceryItemWithStatus[]> {
  const items = await db.getAllAsync<GroceryItem>('SELECT * FROM items ORDER BY category, name');
  return items.map(computeStatus);
}

export async function restockItem(id: number, quantity: number): Promise<void> {
  await db.runAsync(
    `UPDATE items SET currentQuantity = currentQuantity + ?, updatedAt = datetime('now') WHERE id = ?`,
    [quantity, id]
  );
}

export async function deductQuantity(id: number, quantity: number): Promise<void> {
  await db.runAsync(
    `UPDATE items SET currentQuantity = MAX(0, currentQuantity - ?), updatedAt = datetime('now') WHERE id = ?`,
    [quantity, id]
  );
}

// Consumption Logs
//
// IMPORTANT: this only records a log entry and deducts stock for 'manual'/'auto'
// consumption events. For 'restock' entries, the caller is expected to have
// already adjusted the quantity via restockItem() BEFORE calling this - otherwise
// stock would be double-counted (once by restockItem, once by this function).
export async function logConsumption(
  itemId: number,
  quantity: number,
  type: 'manual' | 'auto' | 'restock' = 'manual',
  note?: string
): Promise<void> {
  await db.runAsync(
    `INSERT INTO consumption_logs (itemId, quantity, type, note) VALUES (?, ?, ?, ?)`,
    [itemId, quantity, type, note || null]
  );
  if (type !== 'restock') {
    await deductQuantity(itemId, quantity);
  }
}

export async function getConsumptionLogs(itemId: number, limit?: number): Promise<ConsumptionLog[]> {
  if (limit !== undefined) {
    return db.getAllAsync<ConsumptionLog>(
      'SELECT * FROM consumption_logs WHERE itemId = ? ORDER BY createdAt DESC LIMIT ?',
      [itemId, limit]
    );
  }
  return db.getAllAsync<ConsumptionLog>(
    'SELECT * FROM consumption_logs WHERE itemId = ? ORDER BY createdAt DESC',
    [itemId]
  );
}

export async function getRecentConsumptionLogs(itemId: number, limit: number = 10): Promise<ConsumptionLog[]> {
  return db.getAllAsync<ConsumptionLog>(
    'SELECT * FROM consumption_logs WHERE itemId = ? ORDER BY createdAt DESC LIMIT ?',
    [itemId, limit]
  );
}

// Recent consumption logs across ALL items (not scoped to one item) - used by
// InsightsScreen to compute this-week/this-month counts and top-consumed
// rankings. Distinct from getRecentConsumptionLogs() above, which is scoped
// to a single item.
export async function getAllRecentConsumptionLogs(limit: number = 30): Promise<ConsumptionLog[]> {
  return db.getAllAsync<ConsumptionLog>(
    'SELECT * FROM consumption_logs ORDER BY createdAt DESC LIMIT ?',
    [limit]
  );
}

export async function getWeeklyConsumption(itemId: number): Promise<number> {
  const result = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(quantity) as total FROM consumption_logs 
     WHERE itemId = ? AND createdAt >= datetime('now', '-7 days')`,
    [itemId]
  );
  return result?.total || 0;
}

// Weekly consumption breakdown for a single item over the past N weeks,
// used to render the bar chart on InsightsScreen. Returns oldest week first
// (W1) so the chart reads left-to-right chronologically.
export async function getWeeklyConsumptionBreakdown(
  itemId: number,
  weeksCount: number = 4
): Promise<{ week: string; total: number }[]> {
  const buckets: { week: string; total: number }[] = [];

  for (let i = weeksCount - 1; i >= 0; i--) {
    const result = await db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(quantity) as total FROM consumption_logs
       WHERE itemId = ? AND type != 'restock'
         AND createdAt >= datetime('now', ?)
         AND createdAt < datetime('now', ?)`,
      [itemId, `-${(i + 1) * 7} days`, `-${i * 7} days`]
    );
    buckets.push({ week: `W${weeksCount - i}`, total: result?.total || 0 });
  }

  return buckets;
}

// Shopping List
export async function getShoppingList(): Promise<ShoppingListItem[]> {
  return db.getAllAsync<ShoppingListItem>(
    'SELECT * FROM shopping_list ORDER BY isPurchased ASC, createdAt DESC'
  );
}

export async function addToShoppingList(
  name: string,
  category: string,
  unit: string,
  quantityNeeded: number,
  itemId?: number
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO shopping_list (name, category, unit, quantityNeeded, itemId) VALUES (?, ?, ?, ?, ?)`,
    [name, category, unit, quantityNeeded, itemId || null]
  );
  return result.lastInsertRowId;
}

export async function markAsPurchased(id: number): Promise<void> {
  await db.runAsync('UPDATE shopping_list SET isPurchased = 1 WHERE id = ?', [id]);
}

export async function markAsNotPurchased(id: number): Promise<void> {
  await db.runAsync('UPDATE shopping_list SET isPurchased = 0 WHERE id = ?', [id]);
}

export async function clearPurchasedItems(): Promise<void> {
  await db.runAsync('DELETE FROM shopping_list WHERE isPurchased = 1');
}

export async function removeFromShoppingList(id: number): Promise<void> {
  await db.runAsync('DELETE FROM shopping_list WHERE id = ?', [id]);
}

export async function generateShoppingListFromLowStock(): Promise<void> {
  const lowItems = await db.getAllAsync<GroceryItem>(
    'SELECT * FROM items WHERE currentQuantity <= threshold'
  );

  for (const item of lowItems) {
    // Check if item already exists in shopping list
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM shopping_list WHERE itemId = ? AND isPurchased = 0',
      [item.id]
    );
    if (!existing) {
      const neededQty = item.threshold * 2 - item.currentQuantity; // Restock to 2x threshold
      await addToShoppingList(item.name, item.category, item.unit, Math.max(neededQty, 1), item.id);
    }
  }
}

export async function getShoppingListAsText(): Promise<string> {
  const items = await db.getAllAsync<ShoppingListItem>(
    'SELECT * FROM shopping_list WHERE isPurchased = 0 ORDER BY category, name'
  );

  if (items.length === 0) return 'Shopping list is empty!';

  let text = 'Shopping List:\n';
  let currentCategory = '';
  for (const item of items) {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      text += `\n${currentCategory}:\n`;
    }
    text += `  - ${item.name}: ${item.quantityNeeded} ${item.unit}\n`;
  }
  return text;
}

// Settings
export async function getSettings(): Promise<AppSettings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM settings');
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return {
    defaultConsumptionMode: (settings.defaultConsumptionMode as ConsumptionMode) || 'manual',
    alertFrequency: (settings.alertFrequency as AlertFrequency) || 'daily',
    onboardingComplete: settings.onboardingComplete === 'true',
  };
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  if (updates.defaultConsumptionMode !== undefined) {
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('defaultConsumptionMode', ?)",
      [updates.defaultConsumptionMode]
    );
  }
  if (updates.alertFrequency !== undefined) {
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('alertFrequency', ?)",
      [updates.alertFrequency]
    );
  }
  if (updates.onboardingComplete !== undefined) {
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('onboardingComplete', ?)",
      [updates.onboardingComplete.toString()]
    );
  }
  // Return the fresh settings so callers (e.g. SettingsScreen) can update UI state directly
  return getSettings();
}

export async function markOnboardingComplete(): Promise<void> {
  await updateSettings({ onboardingComplete: true });
}

export async function resetDatabase(): Promise<void> {
  await db.execAsync(`
    DELETE FROM consumption_logs;
    DELETE FROM shopping_list;
    DELETE FROM items;
    DELETE FROM settings;
    INSERT INTO settings (key, value) VALUES ('defaultConsumptionMode', 'manual');
    INSERT INTO settings (key, value) VALUES ('alertFrequency', 'daily');
    INSERT INTO settings (key, value) VALUES ('onboardingComplete', 'false');
  `);
}
