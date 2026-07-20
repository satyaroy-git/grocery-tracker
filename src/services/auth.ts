import { supabase } from './supabase';
import { Session, User, AuthError } from '@supabase/supabase-js';

export interface AuthResult {
  success: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string;
}

// ─── EMAIL AUTH ───────────────────────────────────────────────────────────────

/**
 * Create a new account with email and password.
 * Supabase sends a confirmation email by default (can be disabled in dashboard).
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });

    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user, session: data.session };
  } catch (err: any) {
    return { success: false, error: err.message || 'Sign up failed' };
  }
}

/**
 * Sign in with existing email and password.
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, user: data.user, session: data.session };
  } catch (err: any) {
    return { success: false, error: err.message || 'Sign in failed' };
  }
}

// ─── GOOGLE AUTH ──────────────────────────────────────────────────────────────

/**
 * Sign in with Google OAuth.
 * NOTE: For React Native / Expo, Google OAuth requires additional setup:
 * - A Google Cloud OAuth client ID configured in Supabase Auth settings
 * - expo-auth-session or expo-web-browser for the OAuth redirect flow
 *
 * For now this uses Supabase's built-in OAuth which opens a web browser.
 * Full native Google Sign-In (with the Google One Tap UI) would require
 * expo-google-sign-in or @react-native-google-signin/google-signin plus
 * a development build (not supported in Expo Go).
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'pantrypal://auth/callback',
        skipBrowserRedirect: true,
      },
    });

    if (error) return { success: false, error: error.message };

    // signInWithOAuth returns a URL that needs to be opened in a browser
    // The AuthContext will handle opening this URL and processing the callback
    return {
      success: true,
      user: null,
      session: null,
      error: data.url || undefined,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Google sign in failed' };
  }
}

// ─── SESSION MANAGEMENT ───────────────────────────────────────────────────────

/**
 * Sign out the current user and clear the session.
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Sign out failed' };
  }
}

/**
 * Delete the current user's account permanently.
 * Removes household membership, signs out, and clears the session.
 */
export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const { leaveHousehold } = await import('./household');
    await leaveHousehold();
    await supabase.auth.signOut();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete account' };
  }
}

/**
 * Get the current session (returns null if not authenticated).
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

/**
 * Get the current user (returns null if not authenticated).
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Get the display name from user metadata or email.
 */
export function getDisplayName(user: User | null): string {
  if (!user) return 'Guest';
  return (
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split('@')[0] ||
    'User'
  );
}
