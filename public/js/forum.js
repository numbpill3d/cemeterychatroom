import { db } from './firebase.js';
import {
  collection, doc, addDoc, getDocs,
  query, where, orderBy,
  updateDoc, increment, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

export async function getThreadsByCategory(category) {
  const q = query(
    collection(db, 'threads'),
    where('category', '==', category),
    orderBy('lastPostAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getPosts(threadId) {
  const q = query(
    collection(db, 'threads', threadId, 'posts'),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createThread(uid, username, category, title, body) {
  const now = serverTimestamp();
  const threadRef = await addDoc(collection(db, 'threads'), {
    category,
    title,
    authorUid: uid,
    authorUsername: username,
    createdAt: now,
    lastPostAt: now,
    lastPostUser: username,
    replyCount: 1
  });
  await addDoc(collection(db, 'threads', threadRef.id, 'posts'), {
    authorUid: uid,
    authorUsername: username,
    content: body,
    createdAt: now
  });
  return threadRef.id;
}

export async function createPost(uid, username, threadId, content) {
  const now = serverTimestamp();
  await addDoc(collection(db, 'threads', threadId, 'posts'), {
    authorUid: uid,
    authorUsername: username,
    content,
    createdAt: now
  });
  await updateDoc(doc(db, 'threads', threadId), {
    replyCount: increment(1),
    lastPostAt: now,
    lastPostUser: username
  });
}

