import * as SQLite from 'expo-sqlite';
import { roundQuantity, roundMoney } from '../utils/numberFormat';

// Types
export type ConsumptionMode = 'manual' | 'auto';
export type ConsumptionFrequency = 'daily' | 'weekly' | 'monthly';
export type ItemStatus = 'ok' | 'low' | 'empty';
export type AlertFrequency = 'daily' | 'every_2_days' | 'weekly' | 'never';
// 'system' follows the OS-level appearance setting; 'light'/'dark' pin the
// app to that mode regardless of what the device is set to.
export type ThemeMode = 'light' | 'dark' | 'system';
export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

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
  // Amount paid for this specific purchase event. Only ever set on 'restock'
  // entries (the initial purchase when an item is created, or a later
  // restock where a price was entered). This is what expenditure insights
  // are actually calculated from - NOT items.price, which is just a
  // "most recently known price" snapshot for quick display.
  price: number | null;
  createdAt: string;
}

export interface AppSettings {
  defaultConsumptionMode: ConsumptionMode;
  alertFrequency: AlertFrequency;
  onboardingComplete: boolean;
  themeMode: ThemeMode;
  notificationsEnabled: boolean;
  language: string;
  recipeSuggestionsEnabled: boolean;
}

export interface RecurringItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  frequency: RecurringFrequency;
  nextDueDate: string; // ISO date 'YYYY-MM-DD'
  enabled: boolean;
  createdAt: string;
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
    PRAGMA foreign_keys = ON;

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
      price REAL,
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

    -- User-added categories/units, so a custom entry (e.g. "Floor Cleaner"
    -- category, or a custom unit like "crate") persists and shows up as a
    -- real pickable option for every future item, not just a one-off free
    -- text field that has to be retyped each time.
    CREATE TABLE IF NOT EXISTS custom_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS custom_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      value TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT OR IGNORE INTO settings (key, value) VALUES ('defaultConsumptionMode', 'manual');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('alertFrequency', 'daily');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('onboardingComplete', 'false');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('themeMode', 'system');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notificationsEnabled', 'true');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'en');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('recipeSuggestionsEnabled', 'true');
  `);

  // Create recurring_items table (safe to run on every launch - IF NOT EXISTS)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS recurring_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 1,
      frequency TEXT NOT NULL DEFAULT 'weekly',
      nextDueDate TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS saved_meal_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planJson TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await migrateSchema();
}

// Safe migration: adds price/expiryDate columns to installs that already have
// an `items` table from before these fields existed. CREATE TABLE IF NOT EXISTS
// above only applies to brand-new databases, so existing users need this to
// pick up the new columns without losing their data.
async function migrateSchema(): Promise<void> {
  const itemColumns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(items)`);
  const itemColumnNames = new Set(itemColumns.map((c) => c.name));

  if (!itemColumnNames.has('price')) {
    await db.execAsync(`ALTER TABLE items ADD COLUMN price REAL;`);
  }
  if (!itemColumnNames.has('expiryDate')) {
    await db.execAsync(`ALTER TABLE items ADD COLUMN expiryDate TEXT;`);
  }

  const logColumns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(consumption_logs)`);
  const logColumnNames = new Set(logColumns.map((c) => c.name));
  if (!logColumnNames.has('price')) {
    await db.execAsync(`ALTER TABLE consumption_logs ADD COLUMN price REAL;`);
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
      roundQuantity(input.currentQuantity),
      roundQuantity(input.threshold),
      input.consumptionMode,
      input.autoConsumptionRate,
      input.autoConsumptionFrequency,
      input.price != null ? roundMoney(input.price) : null,
      input.expiryDate ?? null,
    ]
  );
  const itemId = result.lastInsertRowId;

  // Record the initial purchase as a 'restock' log entry so this first
  // purchase counts toward expenditure totals the same way every later
  // restock does. The quantity logged is the initial stock amount (what
  // the user entered as currentQuantity) so Recent Activity correctly
  // shows "+30 nos" instead of a confusing "+0 nos".
  if (input.price !== undefined && input.price !== null && input.price > 0) {
    await db.runAsync(
      `INSERT INTO consumption_logs (itemId, quantity, type, note, price) VALUES (?, ?, 'restock', ?, ?)`,
      [itemId, roundQuantity(input.currentQuantity), 'Initial purchase', input.price]
    );
  } else if (input.currentQuantity > 0) {
    // Even without a price, log the initial stock addition so Recent Activity
    // shows the initial quantity added rather than being empty
    await db.runAsync(
      `INSERT INTO consumption_logs (itemId, quantity, type, note) VALUES (?, ?, 'restock', ?)`,
      [itemId, roundQuantity(input.currentQuantity), 'Initial purchase']
    );
  }

  return itemId;
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
  if (input.currentQuantity !== undefined) { fields.push('currentQuantity = ?'); values.push(roundQuantity(input.currentQuantity)); }
  if (input.threshold !== undefined) { fields.push('threshold = ?'); values.push(roundQuantity(input.threshold)); }
  if (input.consumptionMode !== undefined) { fields.push('consumptionMode = ?'); values.push(input.consumptionMode); }
  if (input.autoConsumptionRate !== undefined) { fields.push('autoConsumptionRate = ?'); values.push(input.autoConsumptionRate); }
  if (input.autoConsumptionFrequency !== undefined) { fields.push('autoConsumptionFrequency = ?'); values.push(input.autoConsumptionFrequency); }
  if (input.price !== undefined) { fields.push('price = ?'); values.push(input.price != null ? roundMoney(input.price) : null); }
  if (input.expiryDate !== undefined) { fields.push('expiryDate = ?'); values.push(input.expiryDate); }

  if (fields.length === 0) return;

  fields.push("updatedAt = datetime('now')");
  values.push(id);

  await db.runAsync(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteItem(id: number): Promise<void> {
  await db.runAsync('DELETE FROM items WHERE id = ?', [id]);
}

// Deletes every pantry item in one go (used by "Delete All" on the Pantry
// screen). Relies on the same FK behavior as deleting a single item:
// - consumption_logs rows cascade-delete (ON DELETE CASCADE), so usage/
//   restock history for every deleted item is cleaned up too, not left
//   orphaned.
// - shopping_list rows that were linked to a deleted item have their
//   itemId set to NULL (ON DELETE SET NULL) rather than being deleted -
//   they remain on the shopping list as a plain unlinked entry, matching
//   exactly what already happens when a single item is deleted via
//   EditItemScreen's delete button.
// Does NOT touch custom_categories/custom_units or app settings - this is
// scoped to pantry items only, unlike the more destructive resetDatabase().
export async function deleteAllItems(): Promise<void> {
  await db.runAsync('DELETE FROM items');
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
  // Previously this did `currentQuantity = currentQuantity + ?` entirely in
  // SQL. Repeated float additions/subtractions on the same row (e.g. add
  // 0.5kg, later log 0.3kg used, restock 0.2kg more...) accumulate binary
  // floating-point noise over time - e.g. landing on 1.2999999999999998
  // instead of 1.3. Reading the current value, adding in JS, and rounding
  // before writing back an absolute value keeps every stored quantity clean.
  const row = await db.getFirstAsync<{ currentQuantity: number }>(
    'SELECT currentQuantity FROM items WHERE id = ?',
    [id]
  );
  const newQuantity = roundQuantity((row?.currentQuantity ?? 0) + quantity);
  await db.runAsync(
    `UPDATE items SET currentQuantity = ?, updatedAt = datetime('now') WHERE id = ?`,
    [newQuantity, id]
  );
}

// Updates items.price to the most recently paid price, so the "Purchase
// Details" card on ItemDetailScreen always shows the latest known price.
// This is purely a display convenience - expenditure totals are computed
// from consumption_logs.price (the actual purchase ledger), never from this
// snapshot field, so it never affects Insights calculations.
export async function updateItemPrice(id: number, price: number): Promise<void> {
  await db.runAsync(
    `UPDATE items SET price = ?, updatedAt = datetime('now') WHERE id = ?`,
    [roundMoney(price), id]
  );
}

export async function deductQuantity(id: number, quantity: number): Promise<void> {
  // Same float-noise fix as restockItem() above - round after computing in JS.
  const row = await db.getFirstAsync<{ currentQuantity: number; threshold: number; name: string; unit: string }>(
    'SELECT currentQuantity, threshold, name, unit FROM items WHERE id = ?',
    [id]
  );
  if (!row) return;
  const oldQuantity = row.currentQuantity;
  const newQuantity = Math.max(0, roundQuantity(oldQuantity - quantity));
  await db.runAsync(
    `UPDATE items SET currentQuantity = ?, updatedAt = datetime('now') WHERE id = ?`,
    [newQuantity, id]
  );

  // Trigger a low-stock notification if this deduction just crossed the
  // threshold (was above before, is at or below now). We import lazily to
  // avoid circular dependency issues (notifications.ts imports from database).
  if (oldQuantity > row.threshold && newQuantity <= row.threshold && newQuantity > 0) {
    try {
      const { triggerLowStockAlert } = await import('../services/notifications');
      await triggerLowStockAlert(row.name, newQuantity, row.unit, row.threshold);
    } catch (error) {
      // Non-critical - don't let notification failure break the deduction
      console.error('Low stock notification failed:', error);
    }
  }
}

// Consumption Logs
//
// IMPORTANT: this only records a log entry and deducts stock for 'manual'/'auto'
// consumption events. For 'restock' entries, the caller is expected to have
// already adjusted the quantity via restockItem() BEFORE calling this - otherwise
// stock would be double-counted (once by restockItem, once by this function).
//
// `price` should only ever be passed for 'restock' entries - it's the amount
// paid for that specific purchase. This is what expenditure totals
// (getExpenditureSummary, getSpendByCategory, getMonthlySpendTrend) are
// actually computed from, so every priced purchase - not just the first one
// when an item is created - is correctly reflected in Insights.
export async function logConsumption(
  itemId: number,
  quantity: number,
  type: 'manual' | 'auto' | 'restock' = 'manual',
  note?: string,
  price?: number | null
): Promise<void> {
  const roundedQuantity = roundQuantity(quantity);
  const roundedPrice = price != null ? roundMoney(price) : null;
  await db.runAsync(
    `INSERT INTO consumption_logs (itemId, quantity, type, note, price) VALUES (?, ?, ?, ?, ?)`,
    [itemId, roundedQuantity, type, note || null, roundedPrice]
  );
  if (type !== 'restock') {
    await deductQuantity(itemId, roundedQuantity);
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

// --- Expenditure insights ---
//
// Spend is derived from consumption_logs.price - a real purchase ledger with
// one entry per priced purchase event (initial item creation AND every later
// restock where a price was entered). This replaces an earlier, incorrect
// approach that summed items.price directly: that field only ever holds the
// MOST RECENT price for an item and is keyed off the item's original
// createdAt timestamp, so restocking an existing item with a new price never
// showed up in "this month" spend, and buying the same item twice only ever
// counted the latest price once - both undercounting actual expenditure.
// Only logged purchases with a price actually set count toward these totals.

export interface ExpenditureSummary {
  totalSpend: number;
  thisMonthSpend: number;
  lastMonthSpend: number;
  purchaseCount: number;
}

export async function getExpenditureSummary(): Promise<ExpenditureSummary> {
  const totalRow = await db.getFirstAsync<{ total: number | null; cnt: number }>(
    `SELECT SUM(price) as total, COUNT(*) as cnt FROM consumption_logs WHERE type = 'restock' AND price IS NOT NULL`
  );
  const thisMonthRow = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(price) as total FROM consumption_logs 
     WHERE type = 'restock' AND price IS NOT NULL AND createdAt >= datetime('now', 'start of month')`
  );
  const lastMonthRow = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(price) as total FROM consumption_logs 
     WHERE type = 'restock' AND price IS NOT NULL
       AND createdAt >= datetime('now', 'start of month', '-1 month') 
       AND createdAt < datetime('now', 'start of month')`
  );

  return {
    totalSpend: totalRow?.total || 0,
    thisMonthSpend: thisMonthRow?.total || 0,
    lastMonthSpend: lastMonthRow?.total || 0,
    purchaseCount: totalRow?.cnt || 0,
  };
}

export interface CategorySpend {
  category: string;
  total: number;
  itemCount: number;
}

export async function getSpendByCategory(): Promise<CategorySpend[]> {
  // Join through items to get each purchase's category, since category
  // lives on items, not on the log entry itself.
  const rows = await db.getAllAsync<{ category: string; total: number; itemCount: number }>(
    `SELECT items.category as category, SUM(consumption_logs.price) as total, COUNT(*) as itemCount
     FROM consumption_logs
     JOIN items ON items.id = consumption_logs.itemId
     WHERE consumption_logs.type = 'restock' AND consumption_logs.price IS NOT NULL
     GROUP BY items.category
     ORDER BY total DESC`
  );
  return rows;
}

export interface MonthlySpend {
  month: string; // e.g. 'Mar' - label only, not sortable across years
  total: number;
}

// Last N months of spend based on consumption_logs.createdAt (i.e. when each
// purchase actually happened), oldest first (for charting left-to-right
// chronologically, same convention as getWeeklyConsumptionBreakdown).
export async function getMonthlySpendTrend(monthsCount: number = 6): Promise<MonthlySpend[]> {
  const buckets: MonthlySpend[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    // Build the upper-bound modifier as a signed offset rather than a fixed
    // "-N months" string, since (i - 1) can be -1 (i.e. "+1 months" for the
    // most recent/current bucket) - concatenating a literal '-' prefix would
    // produce an invalid double-negative like "--1 months" in that case.
    const upperOffset = i - 1;
    const upperModifier = upperOffset <= 0 ? `+${Math.abs(upperOffset)} months` : `-${upperOffset} months`;

    const row = await db.getFirstAsync<{ total: number | null }>(
      `SELECT SUM(price) as total
       FROM consumption_logs
       WHERE type = 'restock' AND price IS NOT NULL
         AND createdAt >= datetime('now', 'start of month', '-${i} months')
         AND createdAt < datetime('now', 'start of month', ?)`,
      [upperModifier]
    );
    const monthDate = new Date();
    monthDate.setDate(1);
    monthDate.setMonth(monthDate.getMonth() - i);
    const label = monthDate.toLocaleDateString('en-IN', { month: 'short' });
    buckets.push({ month: label, total: row?.total || 0 });
  }

  return buckets;
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
    [name, category, unit, roundQuantity(quantityNeeded), itemId || null]
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

// Returns the list of items actually added, so callers (ShoppingListScreen)
// can report how many were added. Previously this returned Promise<void>
// while the caller called `.length` on the result - that would throw a
// TypeError ("Cannot read properties of undefined") every time the
// "Auto-Generate" button was tapped.
export async function generateShoppingListFromLowStock(): Promise<ShoppingListItem[]> {
  const lowItems = await db.getAllAsync<GroceryItem>(
    'SELECT * FROM items WHERE currentQuantity <= threshold'
  );

  const added: ShoppingListItem[] = [];
  for (const item of lowItems) {
    // Check if item already exists in shopping list
    const existing = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM shopping_list WHERE itemId = ? AND isPurchased = 0',
      [item.id]
    );
    if (!existing) {
      const neededQty = roundQuantity(item.threshold * 2 - item.currentQuantity); // Restock to 2x threshold
      const newId = await addToShoppingList(item.name, item.category, item.unit, Math.max(neededQty, 1), item.id);
      added.push({
        id: newId,
        name: item.name,
        quantityNeeded: Math.max(neededQty, 1),
        unit: item.unit,
        category: item.category,
        isPurchased: false,
        itemId: item.id,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return added;
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
    themeMode: (settings.themeMode as ThemeMode) || 'system',
    notificationsEnabled: settings.notificationsEnabled !== 'false',
    language: settings.language || 'en',
    recipeSuggestionsEnabled: settings.recipeSuggestionsEnabled !== 'false',
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
  if (updates.themeMode !== undefined) {
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('themeMode', ?)",
      [updates.themeMode]
    );
  }
  if (updates.notificationsEnabled !== undefined) {
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('notificationsEnabled', ?)",
      [updates.notificationsEnabled.toString()]
    );
  }
  if (updates.language !== undefined) {
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('language', ?)",
      [updates.language]
    );
  }
  if (updates.recipeSuggestionsEnabled !== undefined) {
    await db.runAsync(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('recipeSuggestionsEnabled', ?)",
      [updates.recipeSuggestionsEnabled.toString()]
    );
  }
  // Return the fresh settings so callers (e.g. SettingsScreen) can update UI state directly
  return getSettings();
}

export async function markOnboardingComplete(): Promise<void> {
  await updateSettings({ onboardingComplete: true });
}

// --- Custom categories & units ---
//
// These let a user's custom entry (e.g. typing "Floor Cleaner" as a category)
// persist across the whole app rather than being a one-off value that has to
// be retyped every time. Once added, they show up in the picker alongside
// the built-in DEFAULT_CATEGORIES / UNITS_OF_MEASUREMENT lists everywhere.

export interface CustomUnit {
  value: string;
  label: string;
}

export async function getCustomCategories(): Promise<string[]> {
  const rows = await db.getAllAsync<{ name: string }>(
    'SELECT name FROM custom_categories ORDER BY name COLLATE NOCASE'
  );
  return rows.map((r) => r.name);
}

export async function addCustomCategory(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  await db.runAsync('INSERT OR IGNORE INTO custom_categories (name) VALUES (?)', [trimmed]);
}

export async function getCustomUnits(): Promise<CustomUnit[]> {
  const rows = await db.getAllAsync<{ value: string; label: string }>(
    'SELECT value, label FROM custom_units ORDER BY label COLLATE NOCASE'
  );
  return rows;
}

export async function addCustomUnit(value: string, label?: string): Promise<void> {
  const trimmedValue = value.trim();
  if (!trimmedValue) return;
  await db.runAsync(
    'INSERT OR IGNORE INTO custom_units (value, label) VALUES (?, ?)',
    [trimmedValue, label?.trim() || trimmedValue]
  );
}

// ─── SAVED MEAL PLANS ─────────────────────────────────────────────────────────

export interface SavedMealPlan {
  id: number;
  planJson: string;
  createdAt: string;
}

export async function saveMealPlan(planJson: string): Promise<number> {
  // Insert the new plan first
  const result = await db.runAsync(
    `INSERT INTO saved_meal_plans (planJson) VALUES (?)`,
    [planJson]
  );
  // Then clean up: keep only the latest 5 plans
  const allPlans = await db.getAllAsync<{ id: number }>(
    `SELECT id FROM saved_meal_plans ORDER BY createdAt DESC`
  );
  if (allPlans.length > 5) {
    const idsToKeep = allPlans.slice(0, 5).map((p) => p.id);
    await db.runAsync(
      `DELETE FROM saved_meal_plans WHERE id NOT IN (${idsToKeep.join(',')})`
    );
  }
  return result.lastInsertRowId;
}

export async function getLatestMealPlan(): Promise<SavedMealPlan | null> {
  try {
    const result = await db.getFirstAsync<SavedMealPlan>(
      `SELECT * FROM saved_meal_plans ORDER BY createdAt DESC LIMIT 1`
    );
    return result || null;
  } catch (error) {
    console.error('getLatestMealPlan error:', error);
    return null;
  }
}

export async function getAllSavedMealPlans(): Promise<SavedMealPlan[]> {
  return db.getAllAsync<SavedMealPlan>(
    `SELECT * FROM saved_meal_plans ORDER BY createdAt DESC`
  );
}

export async function deleteMealPlan(id: number): Promise<void> {
  await db.runAsync(`DELETE FROM saved_meal_plans WHERE id = ?`, [id]);
}

// ─── RECURRING ITEMS ──────────────────────────────────────────────────────────

export async function addRecurringItem(input: {
  name: string;
  category: string;
  unit: string;
  quantity: number;
  frequency: RecurringFrequency;
}): Promise<number> {
  // nextDueDate is calculated as the first occurrence from today based on frequency
  const nextDueDate = calculateNextDueDate(new Date(), input.frequency);
  const result = await db.runAsync(
    `INSERT INTO recurring_items (name, category, unit, quantity, frequency, nextDueDate)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.name, input.category, input.unit, input.quantity, input.frequency, nextDueDate]
  );
  return result.lastInsertRowId;
}

export async function getRecurringItems(): Promise<RecurringItem[]> {
  const rows = await db.getAllAsync<{
    id: number; name: string; category: string; unit: string;
    quantity: number; frequency: string; nextDueDate: string;
    enabled: number; createdAt: string;
  }>('SELECT * FROM recurring_items ORDER BY nextDueDate ASC');
  return rows.map((r) => ({
    ...r,
    frequency: r.frequency as RecurringFrequency,
    enabled: r.enabled === 1,
  }));
}

export async function updateRecurringItem(
  id: number,
  updates: Partial<{
    name: string;
    category: string;
    unit: string;
    quantity: number;
    frequency: RecurringFrequency;
    enabled: boolean;
  }>
): Promise<void> {
  const setParts: string[] = [];
  const values: (string | number)[] = [];

  if (updates.name !== undefined) { setParts.push('name = ?'); values.push(updates.name); }
  if (updates.category !== undefined) { setParts.push('category = ?'); values.push(updates.category); }
  if (updates.unit !== undefined) { setParts.push('unit = ?'); values.push(updates.unit); }
  if (updates.quantity !== undefined) { setParts.push('quantity = ?'); values.push(updates.quantity); }
  if (updates.frequency !== undefined) { setParts.push('frequency = ?'); values.push(updates.frequency); }
  if (updates.enabled !== undefined) { setParts.push('enabled = ?'); values.push(updates.enabled ? 1 : 0); }

  if (setParts.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE recurring_items SET ${setParts.join(', ')} WHERE id = ?`, values);
}

export async function deleteRecurringItem(id: number): Promise<void> {
  await db.runAsync('DELETE FROM recurring_items WHERE id = ?', [id]);
}

/**
 * Processes all enabled recurring items whose nextDueDate is today or in the
 * past. For each due item: adds it to the shopping list, then advances
 * nextDueDate to the next occurrence. Idempotent per day since nextDueDate
 * always moves forward.
 */
export async function processAndAdvanceRecurringItems(): Promise<void> {
  const today = toIsoDateOnly(new Date());
  const dueItems = await db.getAllAsync<{
    id: number; name: string; category: string; unit: string;
    quantity: number; frequency: string; nextDueDate: string;
  }>(
    `SELECT * FROM recurring_items WHERE enabled = 1 AND nextDueDate <= ?`,
    [today]
  );

  for (const item of dueItems) {
    // Add to shopping list
    await addToShoppingList(item.name, item.category, item.unit, item.quantity);

    // Advance nextDueDate
    const currentDue = new Date(item.nextDueDate);
    // If the due date is far in the past (user hasn't opened app in weeks),
    // advance relative to today, not the old due date, to avoid flooding the
    // shopping list with catch-up entries.
    const baseDate = currentDue < new Date() ? new Date() : currentDue;
    const nextDate = calculateNextDueDate(baseDate, item.frequency as RecurringFrequency);
    await db.runAsync(
      `UPDATE recurring_items SET nextDueDate = ? WHERE id = ?`,
      [nextDate, item.id]
    );
  }
}

function calculateNextDueDate(from: Date, frequency: RecurringFrequency): string {
  const next = new Date(from);
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'biweekly':
      next.setDate(next.getDate() + 14);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return toIsoDateOnly(next);
}

function toIsoDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function resetDatabase(): Promise<void> {
  await db.execAsync(`
    DELETE FROM consumption_logs;
    DELETE FROM shopping_list;
    DELETE FROM items;
    DELETE FROM custom_categories;
    DELETE FROM custom_units;
    DELETE FROM recurring_items;
    DELETE FROM settings;
    INSERT INTO settings (key, value) VALUES ('defaultConsumptionMode', 'manual');
    INSERT INTO settings (key, value) VALUES ('alertFrequency', 'daily');
    INSERT INTO settings (key, value) VALUES ('onboardingComplete', 'false');
    INSERT INTO settings (key, value) VALUES ('themeMode', 'system');
    INSERT INTO settings (key, value) VALUES ('notificationsEnabled', 'true');
  `);
}
