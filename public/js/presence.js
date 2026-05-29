import { supabase } from './supabase.js';

let presenceChannel = null;
let presenceCb = null;

export function setupPresence(uid, username) {
  presenceChannel = supabase.channel('online-users', {
    config: { presence: { key: uid } }
  });

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      if (!presenceCb) return;
      const state = presenceChannel.presenceState();
      const users = Object.values(state).flatMap(a => a);
      presenceCb(users);
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({ username, online: true });
      }
    });
}

export function teardownPresence() {
  presenceCb = null;
  if (presenceChannel) { supabase.removeChannel(presenceChannel); presenceChannel = null; }
}

export function subscribeToPresence(callback) {
  presenceCb = callback;
  return () => { presenceCb = null; };
}
