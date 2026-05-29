import { supabase } from './supabase.js';

export async function signUp(username, email, password) {
  const lc = username.toLowerCase().trim();
  if (!/^[a-z0-9_]{2,20}$/.test(lc)) {
    throw new Error('username: 2-20 chars, letters/numbers/underscores only');
  }
  // case-insensitive uniqueness check (profiles is public-readable)
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .ilike('username', username)
    .maybeSingle();
  if (existing) throw new Error('that soul is already taken');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });
  if (error) throw error;

  await supabase.from('profiles').insert({ id: data.user.id, username });
  return data.user;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export function logOut() {
  return supabase.auth.signOut();
}

export function onAuth(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}
