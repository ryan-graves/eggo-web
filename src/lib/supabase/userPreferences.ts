import { getSupabaseClient } from './client';
import type {
  HomeSectionConfig,
  ThemePreference,
  UITheme,
  UserPreferences,
} from '@/types';

const TABLE = 'user_preferences';

interface UserPrefsRow {
  id: string;
  user_id: string | null;
  firebase_uid: string | null;
  theme: ThemePreference;
  ui_theme: UITheme;
  home_sections: HomeSectionConfig[] | null;
  updated_at: string;
}

function fromDb(row: UserPrefsRow): UserPreferences {
  return {
    theme: row.theme,
    uiTheme: row.ui_theme,
    homeSections: row.home_sections ?? undefined,
    updatedAt: row.updated_at,
  } as UserPreferences;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromDb(data as UserPrefsRow) : null;
}

export async function setUserPreferences(
  userId: string,
  preferences: Partial<Omit<UserPreferences, 'updatedAt'>>
): Promise<void> {
  const supabase = getSupabaseClient();
  const update: Record<string, unknown> = { user_id: userId };
  if (preferences.theme !== undefined) update.theme = preferences.theme;
  if (preferences.uiTheme !== undefined) update.ui_theme = preferences.uiTheme;
  if (preferences.homeSections !== undefined) update.home_sections = preferences.homeSections;
  const { error } = await supabase
    .from(TABLE)
    .upsert(update, { onConflict: 'user_id' });
  if (error) throw new Error(error.message);
}

export async function updateThemePreference(
  userId: string,
  theme: ThemePreference
): Promise<void> {
  await setUserPreferences(userId, { theme });
}

export async function updateUIThemePreference(
  userId: string,
  uiTheme: UITheme
): Promise<void> {
  await setUserPreferences(userId, { uiTheme });
}

export async function updateHomeSections(
  userId: string,
  homeSections: HomeSectionConfig[]
): Promise<void> {
  await setUserPreferences(userId, { homeSections });
}

/**
 * Realtime subscription to a single user's preferences row. Filters by
 * user_id to avoid leaking other users' rows over the channel.
 */
export function subscribeToUserPreferences(
  userId: string,
  callback: (preferences: UserPreferences | null) => void,
  onError?: (error: Error) => void
): () => void {
  const supabase = getSupabaseClient();

  const refetch = async () => {
    try {
      const prefs = await getUserPreferences(userId);
      callback(prefs);
    } catch (err) {
      console.error('[subscribeToUserPreferences] refetch error:', err);
      onError?.(err as Error);
    }
  };

  void refetch();

  const channel = supabase
    .channel(`user_preferences:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE,
        filter: `user_id=eq.${userId}`,
      },
      () => {
        void refetch();
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
