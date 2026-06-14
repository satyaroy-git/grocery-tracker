import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from './database';
import { ConsumptionLog } from './types';

function mapRowToLog(row: any): ConsumptionLog {
  return { id: row.id, itemId: row.item_id, quantity: row.quantity, type: row.type, note: row.note, createdAt: row.created_at };
}

export async function logConsumption(itemId: string, quantity: number, type: 'manual' | 'auto' | 'restock', note?: string): Promise<ConsumptionLog> {
  const db = await getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();
  await db.runAsync('INSERT INTO consumption_logs (id, item_id, quantity, type, note, created_at) VALUES (?, ?, ?, ?, ?, ?)', [id, itemId, quantity, type, note ?? null, now]);
  return { id, itemId, quantity, type, note: note ?? null, createdAt: now };
}

export async function getConsumptionLogs(itemId: string, limit: number = 50): Promise<ConsumptionLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM consumption_logs WHERE item_id = ? ORDER BY created_at DESC LIMIT ?', [itemId, limit]);
  return rows.map((row: any) => mapRowToLog(row));
}

export async function getRecentConsumptionLogs(days: number = 7): Promise<ConsumptionLog[]> {
  const db = await getDatabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const rows = await db.getAllAsync('SELECT * FROM consumption_logs WHERE created_at >= ? ORDER BY created_at DESC', [cutoff.toISOString()]);
  return rows.map((row: any) => mapRowToLog(row));
}

export async function getWeeklyConsumption(itemId: string, weeks: number = 4): Promise<{ week: string; total: number }[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT strftime('%Y-W%W', created_at) as week, SUM(quantity) as total FROM consumption_logs WHERE item_id = ? AND type != 'restock' AND created_at >= datetime('now', ?) GROUP BY week ORDER BY week ASC`,
    [itemId, `-${weeks * 7} days`]
  );
  return rows.map((row: any) => ({ week: row.week, total: row.total }));
}

export async function getMonthlyConsumption(itemId: string, months: number = 6): Promise<{ month: string; total: number }[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync(
    `SELECT strftime('%Y-%m', created_at) as month, SUM(quantity) as total FROM consumption_logs WHERE item_id = ? AND type != 'restock' AND created_at >= datetime('now', ?) GROUP BY month ORDER BY month ASC`,
    [itemId, `-${months} months`]
  );
  return rows.map((row: any) => ({ month: row.month, total: row.total }));
}

export async function deleteConsumptionLogs(itemId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM consumption_logs WHERE item_id = ?', [itemId]);
}
