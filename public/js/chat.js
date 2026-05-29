import { rtdb } from './firebase.js';
import {
  ref, push, query, limitToLast, onChildAdded, off
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-database.js';

let chatRef = null;
let activeQuery = null;
let activeListener = null;

export function initChat(onMessage) {
  chatRef = ref(rtdb, 'chat/messages');
  activeQuery = query(chatRef, limitToLast(150));
  activeListener = onChildAdded(activeQuery, (snap) => {
    onMessage(snap.val());
  });
}

export function sendMessage(uid, username, text, postName) {
  if (!chatRef) return;
  return push(chatRef, {
    uid,
    username,
    postName: postName || username,
    text: text.trim(),
    timestamp: Date.now()
  });
}

export function destroyChatListener() {
  if (activeQuery && activeListener) {
    off(activeQuery, 'child_added', activeListener);
  }
  chatRef = null;
  activeQuery = null;
  activeListener = null;
}
