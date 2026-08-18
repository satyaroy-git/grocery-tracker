import { supabase } from './supabase';
import { getAllItems, createItem, GroceryItemWithStatus, CreateItemInput } from '../database';
import { getMyHousehold } from './household';
import { RealtimeChannel } from '@supabase/supabase-js';

// ─── PUSH LOCAL ITEMS TO CLOUD ────────────────────────────────────────────────

/**
 * Pushes all local SQLite pantry items to the user's Supabase household.
 * Skips items that already exist in the cloud (matched by name + household).
 * Used during initial sync when joining/creating a household.
 */
export async function pushLocalItemsToCloud(): Promise<{ pushed: number; error?: string }> {
  try {
    const { household } = await getMyHousehold();
    if (!household) return { pushed: 0, error: 'Not in a household' };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { pushed: 0, error: 'Not authenticated' };

    const localItems = await getAllItems();
    if (localItems.length === 0) return { pushed: 0 };

    // Get existing cloud items to avoid duplicates
    const { data: existingItems } = await supabase
      .from('synced_items')
      .select('name')
      .eq('household_id', household.id);

    const existingNames = new Set((existingItems || []).map((i: any) => i.name.toLowerCase()));

    const itemsToInsert = localItems
      .filter((item) => !existingNames.has(item.name.toLowerCase()))
      .map((item) => ({
        household_id: household.id,
        name: item.name,
        category: item.category,
        unit: item.unit,
        current_quantity: item.currentQuantity,
        threshold: item.threshold,
        consumption_mode: item.consumptionMode,
        auto_consumption_rate: item.autoConsumptionRate,
        auto_consumption_frequency: item.autoConsumptionFrequency,
        price: item.price,
        expiry_date: item.expiryDate,
        created_by: user.id,
      }));

    if (itemsToInsert.length === 0) return { pushed: 0 };

    const { error } = await supabase
      .from('synced_items')
      .insert(itemsToInsert);

    if (error) return { pushed: 0, error: error.message };
    return { pushed: itemsToInsert.length };
  } catch (err: any) {
    return { pushed: 0, error: err.message || 'Sync failed' };
  }
}

// ─── PULL CLOUD ITEMS TO LOCAL ────────────────────────────────────────────────

/**
 * Pulls all items from the user's Supabase household and adds any that
 * don't exist locally (matched by name). Used during initial sync.
 */
export async function pullCloudItemsToLocal(): Promise<{ pulled: number; error?: string }> {
  try {
    const { household } = await getMyHousehold();
    if (!household) return { pulled: 0, error: 'Not in a household' };

    const { data: cloudItems, error: fetchError } = await supabase
      .from('synced_items')
      .select('*')
      .eq('household_id', household.id);

    if (fetchError) return { pulled: 0, error: fetchError.message };
    if (!cloudItems || cloudItems.length === 0) return { pulled: 0 };

    // Get existing local items to avoid duplicates
    const localItems = await getAllItems();
    const localNames = new Set(localItems.map((i) => i.name.toLowerCase()));

    let pulled = 0;
    for (const item of cloudItems) {
      if (localNames.has(item.name.toLowerCase())) continue;

      await createItem({
        name: item.name,
        category: item.category,
        unit: item.unit,
        currentQuantity: item.current_quantity,
        threshold: item.threshold,
        consumptionMode: item.consumption_mode || 'manual',
        autoConsumptionRate: item.auto_consumption_rate,
        autoConsumptionFrequency: item.auto_consumption_frequency,
        price: item.price,
        expiryDate: item.expiry_date,
      });
      pulled++;
    }

    return { pulled };
  } catch (err: any) {
    return { pulled: 0, error: err.message || 'Pull failed' };
  }
}

// ─── FULL SYNC ────────────────────────────────────────────────────────────────

/**
 * Performs a full bidirectional sync: pushes local → cloud, then pulls
 * cloud → local. This is a simple "add missing items in both directions"
 * strategy (no conflict resolution needed since both sides just get items
 * the other didn't have).
 */
export async function fullSync(): Promise<{ pushed: number; pulled: number; error?: string }> {
  const pushResult = await pushLocalItemsToCloud();
  if (pushResult.error) return { pushed: 0, pulled: 0, error: pushResult.error };

  const pullResult = await pullCloudItemsToLocal();
  if (pullResult.error) return { pushed: pushResult.pushed, pulled: 0, error: pullResult.error };

  return { pushed: pushResult.pushed, pulled: pullResult.pulled };
}

// ─── PUSH SINGLE ITEM TO CLOUD ────────────────────────────────────────────────

/**
 * Pushes a single item to the cloud (called after creating/updating an item
 * locally). Fire-and-forget - doesn't throw if it fails.
 */
export async function pushItemToCloud(item: GroceryItemWithStatus): Promise<void> {
  try {
    const { household } = await getMyHousehold();
    if (!household) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Upsert by name within the household
    await supabase
      .from('synced_items')
      .upsert(
        {
          household_id: household.id,
          name: item.name,
          category: item.category,
          unit: item.unit,
          current_quantity: item.currentQuantity,
          threshold: item.threshold,
          consumption_mode: item.consumptionMode,
          auto_consumption_rate: item.autoConsumptionRate,
          auto_consumption_frequency: item.autoConsumptionFrequency,
          price: item.price,
          expiry_date: item.expiryDate,
          created_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
  } catch (error) {
    console.error('Failed to push item to cloud:', error);
  }
}

// ─── REALTIME SUBSCRIPTION ────────────────────────────────────────────────────

let realtimeChannel: RealtimeChannel | null = null;

/**
 * Subscribe to real-time changes on synced_items for the current household.
 * Calls `onUpdate` whenever another household member adds/modifies/deletes
 * an item.
 */
export function subscribeToHouseholdChanges(
  householdId: string,
  onUpdate: () => void
): void {
  // Unsubscribe from any existing channel first
  unsubscribeFromHouseholdChanges();

  realtimeChannel = supabase
    .channel(`household-${householdId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'synced_items',
        filter: `household_id=eq.${householdId}`,
      },
      () => {
        onUpdate();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'synced_shopping_list',
        filter: `household_id=eq.${householdId}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();
}

/**
 * Unsubscribe from real-time household changes.
 */
export function unsubscribeFromHouseholdChanges(): void {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}
