import { db } from './firebase.js';
import {
  collection, doc, addDoc, getDocs, getDoc,
  query, where, orderBy, limit,
  updateDoc, increment, serverTimestamp, setDoc
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

const SEED = [
  {
    category: 'gossip', title: 'who else cant sleep at 3am',
    author: 'mourningstar',
    posts: [
      { u: 'mourningstar', c: 'its 3am again and the crows outside wont shut up. anyone awake' },
      { u: 'batwingz', c: 'always. the veil is thinner now' },
      { u: 'ash3s_to_ash3s', c: 'listening to black no 1 on repeat' },
      { u: 'coffin_cake', c: 'drawing in the dark again' },
      { u: 'batwingz', c: 'perfect soundtrack' }
    ]
  },
  {
    category: 'gossip', title: 'saw a figure by the old oak',
    author: 'coffin_cake',
    posts: [
      { u: 'coffin_cake', c: 'walking home past the cemetery and i swear someone was standing by the old oak. no face just shadow' },
      { u: 'Lusynth', c: 'that tree has stories' },
      { u: 'batwingz', c: 'did it follow you' },
      { u: 'mourningstar', c: 'that tree eats light. you saw right' }
    ]
  },
  {
    category: 'music', title: 'current rotation: type o negative',
    author: 'ash3s_to_ash3s',
    posts: [
      { u: 'ash3s_to_ash3s', c: 'october rust on loop for three days straight. peter steele vocals keep me sane' },
      { u: 'batwingz', c: 'bloody kisses is superior fight me' },
      { u: 'mourningstar', c: 'world coming down when it rains' },
      { u: 'ash3s_to_ash3s', c: 'no fighting only mourning' }
    ]
  },
  {
    category: 'music', title: 'make me a funeral playlist',
    author: 'Lusynth',
    posts: [
      { u: 'Lusynth', c: 'adding my chemical romance helena, him join me in death, and eversleep by chelsea wolfe' },
      { u: 'coffin_cake', c: 'draconian - the cry of silence' },
      { u: 'mourningstar', c: 'cocteau twins heaven or las vegas if you want something softer' }
    ]
  },
  {
    category: 'art', title: 'sketches from the mausoleum',
    author: 'coffin_cake',
    posts: [
      { u: 'coffin_cake', c: 'spent the evening drawing gargoyles. ink on ripped notebook paper' },
      { u: 'mourningstar', c: 'post them i want to see' },
      { u: 'batwingz', c: 'scan them at 3am for extra cursed energy' },
      { u: 'coffin_cake', c: 'will scan tomorrow when the sun is dead' }
    ]
  }
];

export async function seedIfEmpty() {
  const metaRef = doc(db, 'metadata', 'seeded');
  const meta = await getDoc(metaRef);
  if (meta.exists()) return;

  // claim the seed lock before writing data
  await setDoc(metaRef, { seededAt: serverTimestamp() });

  for (const t of SEED) {
    const now = serverTimestamp();
    const threadRef = await addDoc(collection(db, 'threads'), {
      category: t.category,
      title: t.title,
      authorUid: '_seed',
      authorUsername: t.author,
      createdAt: now,
      lastPostAt: now,
      lastPostUser: t.posts[t.posts.length - 1].u,
      replyCount: t.posts.length
    });
    for (const p of t.posts) {
      await addDoc(collection(db, 'threads', threadRef.id, 'posts'), {
        authorUid: '_seed',
        authorUsername: p.u,
        content: p.c,
        createdAt: serverTimestamp()
      });
    }
  }
}
