import { supabase } from './supabase';

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'owner' | 'member';
  display_name: string | null;
  joined_at: string;
}

/**
 * Create a new household. The current user becomes the owner.
 */
export async function createHousehold(name: string): Promise<{ success: boolean; household?: Household; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Generate a unique 6-char invite code
    const inviteCode = generateInviteCode();

    const { data, error } = await supabase
      .from('households')
      .insert({
        name,
        invite_code: inviteCode,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Add the creator as owner member
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: data.id,
        user_id: user.id,
        role: 'owner',
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Owner',
      });

    if (memberError) return { success: false, error: memberError.message };

    return { success: true, household: data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create household' };
  }
}

/**
 * Join an existing household using an invite code.
 */
export async function joinHousehold(inviteCode: string): Promise<{ success: boolean; household?: Household; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Check if user is already in a household
    const { data: existingMembership } = await supabase
      .from('household_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingMembership) {
      return { success: false, error: 'You are already in a household. Leave your current one first.' };
    }

    // Find the household by invite code
    const { data: household, error: findError } = await supabase
      .from('households')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase().trim())
      .single();

    if (findError || !household) {
      return { success: false, error: 'Invalid invite code. Please check and try again.' };
    }

    // Join as member
    const { error: joinError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: user.id,
        role: 'member',
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Member',
      });

    if (joinError) {
      if (joinError.code === '23505') {
        return { success: false, error: 'You are already a member of a household.' };
      }
      return { success: false, error: joinError.message };
    }

    return { success: true, household };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to join household' };
  }
}

/**
 * Get the current user's household (if any).
 */
export async function getMyHousehold(): Promise<{ household: Household | null; membership: HouseholdMember | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { household: null, membership: null };

    const { data: membership } = await supabase
      .from('household_members')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!membership) return { household: null, membership: null };

    const { data: household } = await supabase
      .from('households')
      .select('*')
      .eq('id', membership.household_id)
      .single();

    return { household: household || null, membership };
  } catch {
    return { household: null, membership: null };
  }
}

/**
 * Get all members of the current user's household.
 */
export async function getHouseholdMembers(): Promise<HouseholdMember[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single();

    if (!membership) return [];

    const { data: members } = await supabase
      .from('household_members')
      .select('*')
      .eq('household_id', membership.household_id)
      .order('joined_at', { ascending: true });

    return members || [];
  } catch {
    return [];
  }
}

/**
 * Leave the current household. If the user is the owner AND the only member,
 * the household is deleted. Otherwise, just removes the membership.
 */
export async function leaveHousehold(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: membership } = await supabase
      .from('household_members')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!membership) return { success: false, error: 'You are not in a household' };

    // Remove membership
    const { error } = await supabase
      .from('household_members')
      .delete()
      .eq('user_id', user.id);

    if (error) return { success: false, error: error.message };

    // If owner and no other members, delete the household
    if (membership.role === 'owner') {
      const { data: remaining } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', membership.household_id);

      if (!remaining || remaining.length === 0) {
        await supabase
          .from('households')
          .delete()
          .eq('id', membership.household_id);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to leave household' };
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusable chars (0/O, 1/I/L)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
