import { getDatabase } from './database';
import { AppSettings, ConsumptionMode, AlertFrequency } from './types';

function mapRowToSettings(row: any): AppSettings {
  return { id: row.id, defaultConsumptionMode: row.default_consumption_mode as ConsumptionMode, alertFrequency: row.alert_frequency as AlertFrequency, onboardingCompleted: row.onboarding_completed === 1, lastNotificationCheck: row.last_notification_check };
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const row = await db.getFirstAsync('SELECT * FROM app_settings WHERE id = ?', ['default']);
  if (!row) return { id: 'default', defaultConsumptionMode: 'manual', alertFrequency: 'instant', onboardingCompleted: false, lastNotificationCheck: null };
  return mapRowToSettings(row);
}

export async function updateSettings(updates: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
  const db = await getDatabase();
  const sets: string[] = [];
  const values: any[] = [];
  if (updates.defaultConsumptionMode !== undefined) { sets.push('default_consumption_mode = ?'); values.push(updates.defaultConsumptionMode); }
  if (updates.alertFrequency !== undefined) { sets.push('alert_frequency = ?'); values.push(updates.alertFrequency); }
  if (updates.onboardingCompleted !== undefined) { sets.push('onboarding_completed = ?'); values.push(updates.onboardingCompleted ? 1 : 0); }
  if (updates.lastNotificationCheck !== undefined) { sets.push('last_notification_check = ?'); values.push(updates.lastNotificationCheck); }
  if (sets.length > 0) { values.push('default'); await db.runAsync(`UPDATE app_settings SET ${sets.join(', ')} WHERE id = ?`, values); }
  return getSettings();
}

export async function markOnboardingComplete(): Promise<void> {
  await updateSettings({ onboardingCompleted: true });
}

export async function isOnboardingCompleted(): Promise<boolean> {
  const settings = await getSettings();
  return settings.onboardingCompleted;
}
