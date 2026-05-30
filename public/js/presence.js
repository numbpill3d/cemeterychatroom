import { supabase } from './supabase.js';

let presenceChannel = null;
let presenceCb = null;

function push() {
  if (!presenceCb || !presenceChannel) return;
  const state = presenceChannel.presenceState();
  // one entry per key (uid) — prevents multi-tab / stale-socket duplicates
  const users = Object.values(state).map(presences => presences[0]).filter(Boolean);
  presenceCb(users);
}

export function setupPresence(uid, username) {
  presenceChannel = supabase.channel('online-users', {
    config: { presence: { key: uid } }
  });

  presenceChannel
    .on('presence', { event: 'sync'  }, push)
    .on('presence', { event: 'join'  }, push)
    .on('presence', { event: 'leave' }, push)
    .subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      await presenceChannel.track({ username, online: true });
      // track() doesn't always trigger sync, so push manually after
      setTimeout(push, 400);
    });
}

export function teardownPresence() {
  presenceCb = null;
  if (presenceChannel) { supabase.removeChannel(presenceChannel); presenceChannel = null; }
}

export function subscribeToPresence(callback) {
  presenceCb = callback;
  push(); // fire immediately if channel already has state
  return () => { presenceCb = null; };
}
