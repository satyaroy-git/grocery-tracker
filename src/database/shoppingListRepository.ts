import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import { ShoppingListItem } from './types';

function mapRowToShoppingItem(row: any): ShoppingListItem {
  return { id: row.id, itemId: row.item_id, name: row.name, category: row.category, unit: row.unit, quantityNeeded: row.quantity_needed, isPurchased: row.is_purchased === 1, isManuallyAdded: row.is_manually_added === 1, createdAt: row.created_at };
}

export async function getShoppingList(): Promise<ShoppingListItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM shopping_list ORDER BY is_purchased ASC, category ASC, name ASC');
  return rows.map((row: any) => mapRowToShoppingItem(row));
}

export async function getActiveShoppingList(): Promise<ShoppingListItem[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM shopping_list WHERE is_purchased = 0 ORDER BY category ASC, name ASC');
  return rows.map((row: any) => mapRowToShoppingItem(row));
}

export async function addToShoppingList(name: string, category: string, unit: string, quantityNeeded: number, itemId?: string): Promise<ShoppingListItem> {
  const db = await getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();
  const isManuallyAdded = !itemId;
  await db.runAsync(`INSERT INTO shopping_list (id, item_id, name, category, unit, quantity_needed, is_purchased, is_manually_added, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`, [id, itemId ?? null, name, category, unit, quantityNeeded, isManuallyAdded ? 1 : 0, now]);
  return { id, itemId: itemId ?? null, name, category, unit, quantityNeeded, isPurchased: false, isManuallyAdded, createdAt: now };
}

export async function markAsPurchased(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE shopping_list SET is_purchased = 1 WHERE id = ?', [id]);
}

export async function markAsNotPurchased(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE shopping_list SET is_purchased = 0 WHERE id = ?', [id]);
}

export async function removeFromShoppingList(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM shopping_list WHERE id = ?', [id]);
}

export async function clearPurchasedItems(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM shopping_list WHERE is_purchased = 1');
}

export async function clearShoppingList(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM shopping_list');
}

export async function generateShoppingListFromLowStock(): Promise<ShoppingListItem[]> {
  const db = await getDatabase();
  const lowStockItems = await db.getAllAsync(
    `SELECT gi.* FROM grocery_items gi WHERE gi.current_quantity <= gi.threshold AND gi.id NOT IN (SELECT item_id FROM shopping_list WHERE item_id IS NOT NULL AND is_purchased = 0) ORDER BY gi.category ASC, gi.name ASC`
  );
  const newItems: ShoppingListItem[] = [];
  for (const row of lowStockItems as any[]) {
    const quantityNeeded = Math.max(0, row.threshold * 2 - row.current_quantity);
    const item = await addToShoppingList(row.name, row.category, row.unit, quantityNeeded, row.id);
    newItems.push(item);
  }
  return newItems;
}

export async function getShoppingListAsText(): Promise<string> {
  const items = await getActiveShoppingList();
  if (items.length === 0) return 'Shopping list is empty!';
  let text = 'Shopping List\n================\n\n';
  let currentCategory = '';
  for (const item of items) {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      text += `${currentCategory}\n`;
    }
    text += `  - ${item.name} - ${item.quantityNeeded} ${item.unit}\n`;
  }
  text += `\n================\nTotal items: ${items.length}`;
  return text;
}
