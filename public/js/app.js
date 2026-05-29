import { onAuth, signUp, signIn, logOut } from './auth.js';
import { initChat, sendMessage, destroyChatListener } from './chat.js';
import { getThreadsByCategory, getPosts, createThread, createPost, seedIfEmpty } from './forum.js';
import { setupPresence, teardownPresence, subscribeToPresence } from './presence.js';

// ── state ──────────────────────────────────────────────────────────
let currentUser = null;
let currentThread = null;
let currentThreadTitle = '';
let presenceUnsub = null;

// ── dom ────────────────────────────────────────────────────────────
const $loading     = document.getElementById('loading-screen');
const $authOverlay = document.getElementById('auth-overlay');
const $app         = document.getElementById('app');
const $ircLog      = document.getElementById('irc-log');
const $ircInput    = document.getElementById('irc-input');
const $ircForm     = document.getElementById('irc-form');
const $userDisplay = document.getElementById('current-username-display');
const $logoutBtn   = document.getElementById('logout-btn');
const $userList    = document.getElementById('sidebar-user-list');
const $userCount   = document.getElementById('sidebar-count');
const $forumList   = document.getElementById('forum-list');
const $threadView  = document.getElementById('thread-view');
const $threadTitle = document.getElementById('thread-title');
const $replyCount  = document.getElementById('reply-count');
const $threadPosts = document.getElementById('thread-posts');
const $replyText   = document.getElementById('reply-text');
const $newTopicModal = document.getElementById('new-topic-modal');
const $newTopicForm  = document.getElementById('new-topic-form');
const $loginForm   = document.getElementById('login-form');
const $signupForm  = document.getElementById('signup-form');
const $loginError  = document.getElementById('login-error');
const $signupError = document.getElementById('signup-error');

// ── helpers ────────────────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtTime(ts) {
  if (!ts) return '--:--';
  const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ── auth state ─────────────────────────────────────────────────────
onAuth(async (user) => {
  $loading.style.display = 'none';
  if (user) {
    currentUser = user;
    $authOverlay.style.display = 'none';
    $app.style.display = '';
    initApp();
  } else {
    if (currentUser) teardownPresence(currentUser.uid);
    currentUser = null;
    destroyChatListener();
    if (presenceUnsub) { presenceUnsub(); presenceUnsub = null; }
    $app.style.display = 'none';
    $authOverlay.style.display = 'flex';
  }
});

function initApp() {
  $userDisplay.textContent = currentUser.displayName;
  initChat(onChatMessage);
  setupPresence(currentUser.uid, currentUser.displayName);
  presenceUnsub = subscribeToPresence(onPresenceUpdate);
  seedIfEmpty().catch(console.error);
}

// ── navigation ─────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(a =>
    a.classList.toggle('active', a.dataset.page === id)
  );
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (id === 'forum') loadForum();
}

document.querySelectorAll('.nav-link').forEach(l => {
  l.addEventListener('click', e => { e.preventDefault(); showPage(l.dataset.page); });
});

// ── chat ───────────────────────────────────────────────────────────
function onChatMessage(msg) {
  const near = $ircLog.scrollHeight - $ircLog.clientHeight - $ircLog.scrollTop < 60;
  const div = document.createElement('div');
  div.className = 'irc-line';
  div.innerHTML = `<span class="irc-time">[${fmtTime(msg.timestamp)}]</span> <span class="irc-user">&lt;${esc(msg.username)}&gt;</span> ${esc(msg.text)}`;
  $ircLog.appendChild(div);
  if (near || $ircLog.children.length <= 15) $ircLog.scrollTop = $ircLog.scrollHeight;
}

$ircForm.addEventListener('submit', async e => {
  e.preventDefault();
  const text = $ircInput.value.trim();
  if (!text || !currentUser) return;
  $ircInput.value = '';
  try { await sendMessage(currentUser.uid, currentUser.displayName, text); }
  catch (err) { console.error('chat:', err); }
});

// ── presence sidebar ───────────────────────────────────────────────
const SKULL = `<svg width="12" height="12" viewBox="0 0 24 24" fill="#C084FC" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C7.5 2 4 5.2 4 9.5V12c-1.1.6-2 1.7-2 3 0 1.7 1.3 3 3 3h1v4c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-4h1c1.7 0 3-1.3 3-3 0-1.3-.9-2.4-2-3v-2.5C20 5.2 16.5 2 12 2zM8.5 9c.8 0 1.5.7 1.5 1.5S9.3 12 8.5 12 7 11.3 7 10.5 7.7 9 8.5 9zm7 0c.8 0 1.5.7 1.5 1.5S16.3 12 15.5 12 14 11.3 14 10.5 14.7 9 15.5 9zM10 16h4c.6 0 1 .4 1 1s-.4 1-1 1h-4c-.6 0-1-.4-1-1s.4-1 1-1z"/></svg>`;

function onPresenceUpdate(users) {
  $userList.innerHTML = '';
  users.forEach(u => {
    const div = document.createElement('div');
    div.className = 'user';
    div.innerHTML = `${SKULL} ${esc(u.username)}`;
    $userList.appendChild(div);
  });
  const n = users.length;
  $userCount.textContent = `${n} soul${n !== 1 ? 's' : ''} lurking`;
}

// ── forum ──────────────────────────────────────────────────────────
async function loadForum() {
  try {
    const [gossip, music, art] = await Promise.all([
      getThreadsByCategory('gossip'),
      getThreadsByCategory('music'),
      getThreadsByCategory('art')
    ]);
    renderList('gossip', gossip);
    renderList('music', music);
    renderList('art', art);
  } catch (e) {
    console.error('forum load:', e);
  }
}

function renderList(cat, threads) {
  const tbody = document.getElementById('tbl-' + cat);
  if (!tbody) return;
  tbody.innerHTML = '';
  threads.forEach(t => {
    const tr = document.createElement('tr');
    tr.dataset.id = t.id;
    const lt = t.lastPostAt ? fmtTime(t.lastPostAt) : '--:--';
    tr.innerHTML = `<td><a href="#" class="topic-link">${esc(t.title)}</a></td><td class="replies meta">${t.replyCount || 0}</td><td class="last meta">${esc(t.lastPostUser || '')} ${lt}</td>`;
    tr.querySelector('a').addEventListener('click', e => {
      e.preventDefault();
      openThread(t.id, t.title);
    });
    tbody.appendChild(tr);
  });
}

async function openThread(id, title) {
  currentThread = id;
  currentThreadTitle = title;
  $forumList.style.display = 'none';
  $threadView.style.display = 'block';
  $threadTitle.textContent = title;
  $threadPosts.innerHTML = '<div class="irc-welcome">loading...</div>';

  try {
    const posts = await getPosts(id);
    $replyCount.textContent = posts.length + ' posts';
    $threadPosts.innerHTML = '';
    posts.forEach(p => {
      const d = document.createElement('div');
      d.className = 'post';
      d.innerHTML = `<div><span class="post-user">${esc(p.authorUsername)}</span><span class="post-time">${fmtTime(p.createdAt)}</span></div><div class="post-content">${esc(p.content)}</div>`;
      $threadPosts.appendChild(d);
    });
  } catch (e) {
    $threadPosts.innerHTML = '<div class="irc-welcome">could not load posts</div>';
    console.error(e);
  }
}

function backToForum() {
  $threadView.style.display = 'none';
  $forumList.style.display = 'block';
  currentThread = null;
}

document.getElementById('back-btn').addEventListener('click', backToForum);

document.getElementById('reply-btn').addEventListener('click', async () => {
  const text = $replyText.value.trim();
  if (!text || !currentThread || !currentUser) return;
  $replyText.value = '';
  try {
    await createPost(currentUser.uid, currentUser.displayName, currentThread, text);
    await openThread(currentThread, currentThreadTitle);
  } catch (e) { console.error('reply:', e); }
});

document.getElementById('new-topic-btn').addEventListener('click', () => {
  $newTopicModal.style.display = 'flex';
});

document.getElementById('cancel-topic-btn').addEventListener('click', () => {
  $newTopicModal.style.display = 'none';
});

$newTopicForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) return;
  const cat   = document.getElementById('nt-cat').value;
  const title = document.getElementById('nt-title').value.trim();
  const body  = document.getElementById('nt-body').value.trim();
  if (!title || !body) return;
  try {
    const id = await createThread(currentUser.uid, currentUser.displayName, cat, title, body);
    $newTopicModal.style.display = 'none';
    $newTopicForm.reset();
    await loadForum();
    await openThread(id, title);
  } catch (e) { console.error('new topic:', e); }
});

// ── auth ui ────────────────────────────────────────────────────────
document.getElementById('tab-login').addEventListener('click', () => {
  $loginForm.style.display = '';
  $signupForm.style.display = 'none';
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-signup').classList.remove('active');
});

document.getElementById('tab-signup').addEventListener('click', () => {
  $loginForm.style.display = 'none';
  $signupForm.style.display = '';
  document.getElementById('tab-signup').classList.add('active');
  document.getElementById('tab-login').classList.remove('active');
});

$loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  $loginError.textContent = '';
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  try {
    await signIn(email, password);
  } catch (err) {
    $loginError.textContent = friendlyAuthError(err.code) || err.message;
  }
});

$signupForm.addEventListener('submit', async e => {
  e.preventDefault();
  $signupError.textContent = '';
  const username = document.getElementById('signup-username').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  try {
    await signUp(username, email, password);
  } catch (err) {
    $signupError.textContent = err.message;
  }
});

$logoutBtn.addEventListener('click', () => logOut());

function friendlyAuthError(code) {
  const map = {
    'auth/user-not-found': 'the darkness does not recognize you',
    'auth/wrong-password': 'the darkness does not recognize you',
    'auth/invalid-credential': 'the darkness does not recognize you',
    'auth/too-many-requests': 'too many failed attempts. rest a moment',
    'auth/invalid-email': 'that does not look like a valid email',
    'auth/email-already-in-use': 'that email already haunts this place'
  };
  return map[code] || null;
}

// ── sound ──────────────────────────────────────────────────────────
const sigh = document.getElementById('sigh');
function playSigh() {
  try { sigh.volume = 0.4; sigh.currentTime = 0; sigh.play(); } catch (e) {}
}
document.body.addEventListener('mouseover', e => {
  if (e.target.closest('a, button, .btn, .topic-link, .grave-link, .nav-link')) playSigh();
});
