import { getDatabase } from './database';
import { ShoppingTemplate, ShoppingTemplateItem } from './types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 12);
}

function mapRowToTemplate(row: any): ShoppingTemplate {
  return {
    id: row.id,
    name: row.name,
    items: JSON.parse(row.items || '[]'),
    createdAt: row.created_at,
    lastUsed: row.last_used,
  };
}

export async function getAllTemplates(): Promise<ShoppingTemplate[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM shopping_templates ORDER BY last_used DESC, created_at DESC');
  return rows.map((row: any) => mapRowToTemplate(row));
}

export async function getTemplateById(id: string): Promise<ShoppingTemplate | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM shopping_templates WHERE id = ?', [id]);
  if (!row) return null;
  return mapRowToTemplate(row as any);
}

export async function createTemplate(name: string, items: ShoppingTemplateItem[]): Promise<ShoppingTemplate> {
  const db = await getDatabase();
  const id = generateId();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO shopping_templates (id, name, items, created_at) VALUES (?, ?, ?, ?)',
    [id, name, JSON.stringify(items), now]
  );
  return { id, name, items, createdAt: now, lastUsed: null };
}

export async function updateTemplate(id: string, name: string, items: ShoppingTemplateItem[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'UPDATE shopping_templates SET name = ?, items = ? WHERE id = ?',
    [name, JSON.stringify(items), id]
  );
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM shopping_templates WHERE id = ?', [id]);
}

export async function markTemplateUsed(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE shopping_templates SET last_used = ? WHERE id = ?', [now, id]);
}

export async function createTemplateFromCurrentShoppingList(): Promise<ShoppingTemplate | null> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM shopping_list WHERE is_purchased = 0 ORDER BY category, name');
  if (!rows || rows.length === 0) return null;

  const items: ShoppingTemplateItem[] = rows.map((row: any) => ({
    name: row.name,
    category: row.category,
    unit: row.unit,
    quantity: row.quantity_needed,
  }));

  return createTemplate('My Shopping List', items);
}
