import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function mapDatabaseItem(row) {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    date: row.item_date,
    time: row.item_time?.slice(0, 5) || '17:00',
    color: row.collection_color,
    ...(row.kind === 'assignment'
      ? { module: row.collection_name, dangerDays: row.danger_days, amberDays: row.amber_days }
      : { group: row.collection_name }),
  };
}

export function toDatabaseItem(item, userId, collections) {
  const collectionName = item.module || item.group;
  const collection = collections.find(entry => entry.name === collectionName);
  return {
    id: typeof item.id === 'string' ? item.id : undefined,
    user_id: userId,
    kind: item.kind,
    title: item.title.trim(),
    item_date: item.date,
    item_time: item.time,
    collection_name: collectionName,
    collection_color: collection?.color || item.color || '#64748b',
    danger_days: item.kind === 'assignment' ? Number(item.dangerDays) : null,
    amber_days: item.kind === 'assignment' ? Number(item.amberDays) : null,
    updated_at: new Date().toISOString(),
  };
}

export async function loadWorkspace(user) {
  const [profileResult, collectionResult, itemResult] = await Promise.all([
    supabase.from('profiles').select('name,email,school,course').eq('id', user.id).maybeSingle(),
    supabase.from('collections').select('id,type,name,color').order('created_at'),
    supabase.from('calendar_items').select('*').order('item_date').order('item_time'),
  ]);
  const error = profileResult.error || collectionResult.error || itemResult.error;
  if (error) throw error;
  const collections = collectionResult.data || [];
  return {
    profile: profileResult.data || {
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
      email: user.email || '',
      school: '',
      course: '',
    },
    modules: collections.filter(entry => entry.type === 'module'),
    groups: collections.filter(entry => entry.type === 'group'),
    assignments: (itemResult.data || []).filter(entry => entry.kind === 'assignment').map(mapDatabaseItem),
    events: (itemResult.data || []).filter(entry => entry.kind === 'event').map(mapDatabaseItem),
  };
}

export async function saveDatabaseItem(item, userId, collections) {
  const payload = toDatabaseItem(item, userId, collections);
  const query = payload.id
    ? supabase.from('calendar_items').update(payload).eq('id', payload.id)
    : supabase.from('calendar_items').insert(payload);
  const { data, error } = await query.select().single();
  if (error) throw error;
  return mapDatabaseItem(data);
}

export async function deleteDatabaseItem(id) {
  const { error } = await supabase.from('calendar_items').delete().eq('id', id);
  if (error) throw error;
}

export async function createCollection(entry, type, userId) {
  const { data, error } = await supabase.from('collections').insert({ ...entry, type, user_id: userId }).select('id,type,name,color').single();
  if (error) throw error;
  return data;
}

export async function saveProfile(profile, userId) {
  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (profile.email.trim().toLowerCase() !== authData.user.email?.toLowerCase()) {
    const { error: emailError } = await supabase.auth.updateUser({ email: profile.email.trim() });
    if (emailError) throw emailError;
  }
  const payload = { id: userId, ...profile, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('profiles').upsert(payload).select('name,email,school,course').single();
  if (error) throw error;
  return data;
}
