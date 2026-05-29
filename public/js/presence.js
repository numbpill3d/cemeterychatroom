import { rtdb } from './firebase.js';
import {
  ref, set, remove, onDisconnect, onValue, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js';

export function setupPresence(uid, username) {
  const connectedRef = ref(rtdb, '.info/connected');
  const presRef = ref(rtdb, `presence/${uid}`);

  onValue(connectedRef, (snap) => {
    if (!snap.val()) return;
    onDisconnect(presRef).remove();
    set(presRef, { username, online: true, lastSeen: serverTimestamp() });
  });
}

export function teardownPresence(uid) {
  const presRef = ref(rtdb, `presence/${uid}`);
  remove(presRef).catch(() => {});
}

export function subscribeToPresence(callback) {
  const allRef = ref(rtdb, 'presence');
  const unsub = onValue(allRef, (snap) => {
    const users = [];
    snap.forEach(child => users.push(child.val()));
    callback(users);
  });
  return unsub;
}
