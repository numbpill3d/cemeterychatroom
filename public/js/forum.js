import { supabase } from './supabase.js';

export async function getThreadsByCategory(category) {
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('category', category)
    .order('last_post_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getPosts(threadId) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createThread(uid, username, category, title, body) {
  const { data: thread, error: te } = await supabase
    .from('threads')
    .insert({ category, title, author_uid: uid, author_username: username, last_post_user: username, reply_count: 1 })
    .select()
    .single();
  if (te) throw te;

  const { error: pe } = await supabase
    .from('posts')
    .insert({ thread_id: thread.id, author_uid: uid, author_username: username, content: body });
  if (pe) throw pe;

  return thread.id;
}

export async function createPost(uid, username, threadId, content) {
  const { error: pe } = await supabase
    .from('posts')
    .insert({ thread_id: threadId, author_uid: uid, author_username: username, content });
  if (pe) throw pe;

  const { data: t } = await supabase.from('threads').select('reply_count').eq('id', threadId).single();
  await supabase.from('threads').update({
    reply_count: (t?.reply_count || 0) + 1,
    last_post_at: new Date().toISOString(),
    last_post_user: username
  }).eq('id', threadId);
}
