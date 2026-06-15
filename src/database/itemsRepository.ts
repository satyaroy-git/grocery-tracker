import { generateId } from '../utils/uuid';
import { getDatabase } from './database';
import { GroceryItem, GroceryItemWithStatus, ItemStatus, ConsumptionMode, ConsumptionFrequency } from './types';

function mapRowToItem(row: any): GroceryItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    currentQuantity: row.current_quantity,
    threshold: row.threshold,
    consumptionMode: row.consumption_mode as ConsumptionMode,
    autoConsumptionRate: row.auto_consumption_rate,
    autoConsumptionFrequency: row.auto_consumption_frequency as ConsumptionFrequency | null,
    lastAutoDeduction: row.last_auto_deduction,
    expiryDate: row.expiry_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getItemStatus(item: GroceryItem): ItemStatus {
  if (item.currentQuantity <= 0) return 'out_of_stock';
  if (item.currentQuantity <= item.threshold) return 'low';
  return 'sufficient';
}

function calculateDaysUntilEmpty(item: GroceryItem): number | null {
  if (item.consumptionMode !== 'auto' || !item.autoConsumptionRate || item.autoConsumptionRate <= 0) {
    return null;
  }
  let dailyRate: number;
  switch (item.autoConsumptionFrequency) {
    case 'daily': dailyRate = item.autoConsumptionRate; break;
    case 'weekly': dailyRate = item.autoConsumptionRate / 7; break;
    case 'monthly': dailyRate = item.autoConsumptionRate / 30; break;
    default: return null;
  }
  if (dailyRate <= 0) return null;
  return Math.floor(item.currentQuantity / dailyRate);
}

function enrichItemWithStatus(item: GroceryItem): GroceryItemWithStatus {
  const daysUntilExpiry = item.expiryDate ? Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  let expiryStatus: 'fresh' | 'expiring_soon' | 'expired' | null = null;
  if (daysUntilExpiry !== null) {
    if (daysUntilExpiry < 0) expiryStatus = 'expired';
    else if (daysUntilExpiry <= 3) expiryStatus = 'expiring_soon';
    else expiryStatus = 'fresh';
  }
  return { ...item, status: getItemStatus(item), daysUntilEmpty: calculateDaysUntilEmpty(item), daysUntilExpiry, expiryStatus };
}

export async function getAllItems(): Promise<GroceryItemWithStatus[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM grocery_items ORDER BY name ASC');
  return rows.map((row: any) => enrichItemWithStatus(mapRowToItem(row)));
}

export async function getItemById(id: string): Promise<GroceryItemWithStatus | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM grocery_items WHERE id = ?', [id]);
  if (!row) return null;
  return enrichItemWithStatus(mapRowToItem(row as any));
}

export async function getItemsByCategory(category: string): Promise<GroceryItemWithStatus[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM grocery_items WHERE category = ? ORDER BY name ASC', [category]);
  return rows.map((row: any) => enrichItemWithStatus(mapRowToItem(row)));
}

export async function getLowStockItems(): Promise<GroceryItemWithStatus[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM grocery_items WHERE current_quantity <= threshold ORDER BY current_quantity ASC');
  return rows.map((row: any) => enrichItemWithStatus(mapRowToItem(row)));
}

export async function searchItems(query: string): Promise<GroceryItemWithStatus[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM grocery_items WHERE name LIKE ? ORDER BY name ASC', [`%${query}%`]);
  return rows.map((row: any) => enrichItemWithStatus(mapRowToItem(row)));
}

export interface CreateItemInput {
  name: string;
  category: string;
  unit: string;
  currentQuantity: number;
  threshold: number;
  consumptionMode: ConsumptionMode;
  autoConsumptionRate?: number | null;
  autoConsumptionFrequency?: ConsumptionFrequency | null;
  expiryDate?: string | null;
}

export async function createItem(input: CreateItemInput): Promise<GroceryItemWithStatus> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO grocery_items (id, name, category, unit, current_quantity, threshold, consumption_mode, auto_consumption_rate, auto_consumption_frequency, expiry_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name, input.category, input.unit, input.currentQuantity, input.threshold, input.consumptionMode, input.autoConsumptionRate ?? null, input.autoConsumptionFrequency ?? null, input.expiryDate ?? null, now, now]
  );
  return (await getItemById(id))!;
}

export async function updateItem(id: string, input: Partial<CreateItemInput>): Promise<GroceryItemWithStatus | null> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const values: any[] = [now];
  if (input.name !== undefined) { sets.push('name = ?'); values.push(input.name); }
  if (input.category !== undefined) { sets.push('category = ?'); values.push(input.category); }
  if (input.unit !== undefined) { sets.push('unit = ?'); values.push(input.unit); }
  if (input.currentQuantity !== undefined) { sets.push('current_quantity = ?'); values.push(input.currentQuantity); }
  if (input.threshold !== undefined) { sets.push('threshold = ?'); values.push(input.threshold); }
  if (input.consumptionMode !== undefined) { sets.push('consumption_mode = ?'); values.push(input.consumptionMode); }
  if (input.autoConsumptionRate !== undefined) { sets.push('auto_consumption_rate = ?'); values.push(input.autoConsumptionRate); }
  if (input.autoConsumptionFrequency !== undefined) { sets.push('auto_consumption_frequency = ?'); values.push(input.autoConsumptionFrequency); }
  if ((input as any).expiryDate !== undefined) { sets.push('expiry_date = ?'); values.push((input as any).expiryDate); }
  values.push(id);
  await db.runAsync(`UPDATE grocery_items SET ${sets.join(', ')} WHERE id = ?`, values);
  return getItemById(id);
}

export async function deleteItem(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM grocery_items WHERE id = ?', [id]);
}

export async function deductQuantity(id: string, amount: number): Promise<GroceryItemWithStatus | null> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE grocery_items SET current_quantity = MAX(0, current_quantity - ?), updated_at = ? WHERE id = ?`, [amount, now, id]);
  return getItemById(id);
}

export async function restockItem(id: string, newQuantity: number): Promise<GroceryItemWithStatus | null> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(`UPDATE grocery_items SET current_quantity = ?, updated_at = ? WHERE id = ?`, [newQuantity, now, id]);
  return getItemById(id);
}

export async function getItemCount(): Promise<{ total: number; low: number; outOfStock: number }> {
  const db = await getDatabase();
  const total = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM grocery_items');
  const low = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM grocery_items WHERE current_quantity > 0 AND current_quantity <= threshold');
  const outOfStock = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM grocery_items WHERE current_quantity <= 0');
  return { total: total?.count ?? 0, low: low?.count ?? 0, outOfStock: outOfStock?.count ?? 0 };
}

export async function getAutoConsumptionItems(): Promise<GroceryItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(`SELECT * FROM grocery_items WHERE consumption_mode = 'auto' AND auto_consumption_rate > 0 AND current_quantity > 0`);
  return rows.map((row: any) => mapRowToItem(row));
}

export async function updateLastAutoDeduction(id: string, date: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE grocery_items SET last_auto_deduction = ?, updated_at = ? WHERE id = ?', [date, date, id]);
}

export async function getExpiringItems(daysAhead: number = 3): Promise<GroceryItemWithStatus[]> {
  const allItems = await getAllItems();
  return allItems.filter((item) => item.expiryStatus === 'expiring_soon' || item.expiryStatus === 'expired');
}

export async function getExpiredItems(): Promise<GroceryItemWithStatus[]> {
  const allItems = await getAllItems();
  return allItems.filter((item) => item.expiryStatus === 'expired');
}
