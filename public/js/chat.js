import { supabase } from './supabase.js';

let channel = null;
const seen = new Set();

export async function initChat(onMessage) {
  seen.clear();
  // load recent history
  const { data } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(150);
  if (data) data.reverse().forEach(m => { seen.add(m.id); onMessage(m); });

  // subscribe to new messages
  channel = supabase
    .channel('messages-insert')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: m }) => {
      if (seen.has(m.id)) return;
      seen.add(m.id);
      onMessage(m);
    })
    .subscribe();
}

export async function sendMessage(uid, username, text, postName) {
  const { error } = await supabase.from('messages').insert({
    user_id: uid,
    username,
    post_name: postName || username,
    text: text.trim()
  });
  if (error) throw error;
}

export function destroyChatListener() {
  if (channel) { supabase.removeChannel(channel); channel = null; }
  seen.clear();
}
