/**
 * Supabase client for Family Sharing feature.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to your Supabase Dashboard → Settings → API
 * 2. Copy your Project URL and Anon Key
 * 3. Replace the values below
 * 4. Run supabase-schema.sql in your SQL Editor
 */

import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your Supabase project credentials
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Generate a unique device ID (persisted locally)
let deviceId: string | null = null;

export function getDeviceId(): string {
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  }
  return deviceId;
}

export function setDeviceId(id: string): void {
  deviceId = id;
}

// ============================================================
// FAMILY MANAGEMENT
// ============================================================

/**
 * Generate a random 6-digit family code
 */
function generateFamilyCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Create a new family and return the sharing code
 */
export async function createFamily(displayName: string): Promise<{ familyId: string; familyCode: string } | null> {
  try {
    const familyCode = generateFamilyCode();
    const device = getDeviceId();

    // Create family
    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({ family_code: familyCode, name: `${displayName}'s Family`, created_by: device })
      .select()
      .single();

    if (familyError || !family) return null;

    // Add creator as member
    await supabase
      .from('family_members')
      .insert({ family_id: family.id, device_id: device, display_name: displayName });

    return { familyId: family.id, familyCode };
  } catch (error) {
    console.error('Create family failed:', error);
    return null;
  }
}

/**
 * Join an existing family using a 6-digit code
 */
export async function joinFamily(familyCode: string, displayName: string): Promise<{ familyId: string; familyName: string } | null> {
  try {
    const device = getDeviceId();

    // Find family by code
    const { data: family, error } = await supabase
      .from('families')
      .select('*')
      .eq('family_code', familyCode)
      .single();

    if (error || !family) return null;

    // Add as member (upsert to handle rejoining)
    await supabase
      .from('family_members')
      .upsert({ family_id: family.id, device_id: device, display_name: displayName });

    return { familyId: family.id, familyName: family.name };
  } catch (error) {
    console.error('Join family failed:', error);
    return null;
  }
}

/**
 * Get family members
 */
export async function getFamilyMembers(familyId: string): Promise<{ deviceId: string; displayName: string; joinedAt: string }[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('family_id', familyId);

  if (error || !data) return [];
  return data.map((m: any) => ({ deviceId: m.device_id, displayName: m.display_name, joinedAt: m.joined_at }));
}

// ============================================================
// SHARED SHOPPING LIST
// ============================================================

export async function getSharedShoppingList(familyId: string) {
  const { data, error } = await supabase
    .from('shared_shopping_list')
    .select('*')
    .eq('family_id', familyId)
    .order('is_purchased', { ascending: true })
    .order('category')
    .order('name');

  if (error) return [];
  return data || [];
}

export async function addToSharedList(familyId: string, item: { name: string; category: string; unit: string; quantity: number }) {
  const device = getDeviceId();
  const { error } = await supabase
    .from('shared_shopping_list')
    .insert({ family_id: familyId, ...item, quantity_needed: item.quantity, added_by: device });

  return !error;
}

export async function toggleSharedItemPurchased(itemId: string, purchased: boolean) {
  const device = getDeviceId();
  const { error } = await supabase
    .from('shared_shopping_list')
    .update({ is_purchased: purchased, purchased_by: purchased ? device : null, updated_at: new Date().toISOString() })
    .eq('id', itemId);

  return !error;
}

export async function removeFromSharedList(itemId: string) {
  const { error } = await supabase
    .from('shared_shopping_list')
    .delete()
    .eq('id', itemId);

  return !error;
}

// ============================================================
// SHARED PANTRY
// ============================================================

export async function syncPantryToCloud(familyId: string, items: { name: string; category: string; unit: string; currentQuantity: number; threshold: number; expiryDate?: string | null }[]) {
  const device = getDeviceId();

  // Clear existing and re-upload (simple sync strategy)
  await supabase
    .from('shared_pantry')
    .delete()
    .eq('family_id', familyId)
    .eq('last_updated_by', device);

  if (items.length === 0) return true;

  const rows = items.map((item) => ({
    family_id: familyId,
    name: item.name,
    category: item.category,
    unit: item.unit,
    current_quantity: item.currentQuantity,
    threshold: item.threshold,
    expiry_date: item.expiryDate || null,
    last_updated_by: device,
  }));

  const { error } = await supabase
    .from('shared_pantry')
    .insert(rows);

  return !error;
}

export async function getSharedPantry(familyId: string) {
  const { data, error } = await supabase
    .from('shared_pantry')
    .select('*')
    .eq('family_id', familyId)
    .order('category')
    .order('name');

  if (error) return [];
  return data || [];
}

// ============================================================
// REALTIME SUBSCRIPTIONS
// ============================================================

export function subscribeToShoppingList(familyId: string, callback: (payload: any) => void) {
  return supabase
    .channel(`shopping_${familyId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'shared_shopping_list',
      filter: `family_id=eq.${familyId}`,
    }, callback)
    .subscribe();
}

export function unsubscribeFromChannel(channel: any) {
  if (channel) {
    supabase.removeChannel(channel);
  }
}
