import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('grocery_tracker.db');
    await initializeDatabase(db);
  }
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      is_custom INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS grocery_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      current_quantity REAL NOT NULL DEFAULT 0,
      threshold REAL NOT NULL DEFAULT 0,
      consumption_mode TEXT NOT NULL DEFAULT 'manual',
      auto_consumption_rate REAL,
      auto_consumption_frequency TEXT,
      last_auto_deduction TEXT,
      expiry_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS consumption_logs (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      type TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES grocery_items(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shopping_list (
      id TEXT PRIMARY KEY,
      item_id TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Other',
      unit TEXT NOT NULL DEFAULT 'pieces',
      quantity_needed REAL NOT NULL DEFAULT 0,
      is_purchased INTEGER NOT NULL DEFAULT 0,
      is_manually_added INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (item_id) REFERENCES grocery_items(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id TEXT PRIMARY KEY,
      default_consumption_mode TEXT NOT NULL DEFAULT 'manual',
      alert_frequency TEXT NOT NULL DEFAULT 'instant',
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      last_notification_check TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_grocery_items_category ON grocery_items(category);
    CREATE INDEX IF NOT EXISTS idx_consumption_logs_item ON consumption_logs(item_id);
    CREATE INDEX IF NOT EXISTS idx_consumption_logs_date ON consumption_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_shopping_list_purchased ON shopping_list(is_purchased);

    CREATE TABLE IF NOT EXISTS shopping_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      items TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_used TEXT
    );
  `);

  const settings = await database.getFirstAsync('SELECT id FROM app_settings LIMIT 1');
  if (!settings) {
    await database.runAsync(
      'INSERT INTO app_settings (id, default_consumption_mode, alert_frequency, onboarding_completed) VALUES (?, ?, ?, ?)',
      ['default', 'manual', 'instant', 0]
    );
  }
}

export async function resetDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DROP TABLE IF EXISTS consumption_logs;
    DROP TABLE IF EXISTS shopping_list;
    DROP TABLE IF EXISTS grocery_items;
    DROP TABLE IF EXISTS categories;
    DROP TABLE IF EXISTS app_settings;
  `);
  db = null;
  await getDatabase();
}
