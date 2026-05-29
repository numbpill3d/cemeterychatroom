import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js';
import {
  doc, setDoc, getDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js';

export async function signUp(username, email, password) {
  const lc = username.toLowerCase().trim();
  if (!/^[a-z0-9_]{2,20}$/.test(lc)) {
    throw new Error('username: 2-20 chars, letters/numbers/underscores only');
  }
  const taken = await getDoc(doc(db, 'usernames', lc));
  if (taken.exists()) {
    throw new Error('that soul is already taken');
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: username });
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    username,
    email,
    joinedAt: serverTimestamp()
  });
  await setDoc(doc(db, 'usernames', lc), { uid: cred.user.uid });
  return cred.user;
}

export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export function logOut() {
  return signOut(auth);
}

export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
