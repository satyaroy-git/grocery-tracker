/**
 * Daily API call limiter — protects against unexpected Gemini API costs
 * if the app gets high traffic. This is NOT a monetization paywall — it's
 * a safety net. Normal users (2-5 AI calls/day) will never hit this.
 *
 * Limit: 20 AI calls per day per user (resets at midnight local time).
 * Covers: invoice scanning, recipe suggestions, weekly meal plan,
 * voice commands, and shelf scan.
 */

import * as FileSystem from 'expo-file-system/legacy';

const LIMITER_FILE = `${FileSystem.documentDirectory}api_usage.json`;
const DAILY_LIMIT = 20;

interface UsageData {
  date: string; // 'YYYY-MM-DD' local date
  count: number;
}

let cachedUsage: UsageData | null = null;

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function loadUsage(): Promise<UsageData> {
  const today = getTodayDate();

  // Return cached if it's still today
  if (cachedUsage && cachedUsage.date === today) {
    return cachedUsage;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(LIMITER_FILE);
    if (fileInfo.exists) {
      const content = await FileSystem.readAsStringAsync(LIMITER_FILE);
      const data = JSON.parse(content) as UsageData;
      // If the saved date is today, use it; otherwise reset
      if (data.date === today) {
        cachedUsage = data;
        return data;
      }
    }
  } catch (error) {
    // File doesn't exist or is corrupted — start fresh
  }

  // New day or first use — reset counter
  cachedUsage = { date: today, count: 0 };
  return cachedUsage;
}

async function saveUsage(usage: UsageData): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(LIMITER_FILE, JSON.stringify(usage));
    cachedUsage = usage;
  } catch (error) {
    console.error('Failed to save API usage:', error);
  }
}

/**
 * Check if the user can make another API call today.
 * Returns { allowed: true } if under limit, or { allowed: false, remaining: 0 } if limit hit.
 */
export async function checkApiLimit(): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const usage = await loadUsage();
  const remaining = Math.max(0, DAILY_LIMIT - usage.count);
  return {
    allowed: usage.count < DAILY_LIMIT,
    remaining,
    limit: DAILY_LIMIT,
  };
}

/**
 * Record one API call. Call this AFTER a successful Gemini API response.
 */
export async function recordApiCall(): Promise<void> {
  const usage = await loadUsage();
  const today = getTodayDate();

  // Reset if it's a new day
  if (usage.date !== today) {
    usage.date = today;
    usage.count = 0;
  }

  usage.count += 1;
  await saveUsage(usage);
}

/**
 * Get current usage stats (for display purposes).
 */
export async function getApiUsageStats(): Promise<{ used: number; limit: number; remaining: number }> {
  const usage = await loadUsage();
  const today = getTodayDate();

  // If it's a new day, return fresh stats
  if (usage.date !== today) {
    return { used: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT };
  }

  return {
    used: usage.count,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - usage.count),
  };
}
