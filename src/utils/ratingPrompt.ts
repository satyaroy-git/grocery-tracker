/**
 * App Store Rating Prompt
 * Asks user to rate the app after 5+ meaningful interactions.
 * Uses expo-store-review for native rating dialog.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const USAGE_COUNT_KEY = '@pantrypal_usage_count';
const RATING_SHOWN_KEY = '@pantrypal_rating_shown';
const THRESHOLD = 5; // Show after 5 uses

/**
 * Call this after meaningful actions (add item, log usage, restock)
 * After 5+ actions, prompts the native rating dialog (once only)
 */
export async function trackUsageAndPromptRating(): Promise<void> {
  try {
    // Check if already shown
    const alreadyShown = await AsyncStorage.getItem(RATING_SHOWN_KEY);
    if (alreadyShown === 'true') return;

    // Increment count
    const countStr = await AsyncStorage.getItem(USAGE_COUNT_KEY);
    const count = (parseInt(countStr || '0', 10)) + 1;
    await AsyncStorage.setItem(USAGE_COUNT_KEY, count.toString());

    // Show rating prompt after threshold
    if (count >= THRESHOLD) {
      try {
        const StoreReview = require('expo-store-review');
        const isAvailable = await StoreReview.isAvailableAsync();
        if (isAvailable) {
          await StoreReview.requestReview();
          await AsyncStorage.setItem(RATING_SHOWN_KEY, 'true');
        }
      } catch (e) {
        // Store review not available (e.g., in Expo Go)
      }
    }
  } catch (e) {
    // Silent fail
  }
}
