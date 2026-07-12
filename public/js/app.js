import { onAuth, signUp, signIn, logOut } from './auth.js';
import { initChat, sendMessage, destroyChatListener } from './chat.js';
import { getThreadsByCategory, getPosts, createThread, createPost } from './forum.js';
import { setupPresence, teardownPresence, subscribeToPresence } from './presence.js';
import { checkBackendHealth } from './supabase.js';

// ── state ──────────────────────────────────────────────────────────
let currentUser = null;
let currentThread = null;
let currentThreadTitle = '';
let presenceUnsub = null;
let chatPostNum = 0;
let bootstrappedUserId = null;

// ── dom ────────────────────────────────────────────────────────────
const $loading     = document.getElementById('loading-screen');
const $authOverlay = document.getElementById('auth-overlay');
const $app         = document.getElementById('app');
const $ircLog      = document.getElementById('irc-log');
const $ircInput    = document.getElementById('irc-input');
const $ircForm     = document.getElementById('irc-form');
const $postName    = document.getElementById('post-name');
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

function setAuthFormsEnabled(enabled) {
  document.querySelectorAll('#auth-overlay input, #auth-overlay .auth-submit').forEach(el => {
    el.disabled = !enabled;
  });
  document.querySelectorAll('#auth-overlay .auth-submit').forEach(el => {
    if (!el.dataset.label) el.dataset.label = el.textContent;
    el.textContent = enabled ? el.dataset.label : '[backend offline]';
  });
}

// ── helpers ────────────────────────────────────────────────────────
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getUsername(user) {
  return user?.user_metadata?.username || user?.email?.split('@')[0] || 'Anonymous';
}

function chanDate(ts) {
  if (!ts) return '--';
  const d = new Date(ts);
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth()+1)}/${p(d.getDate())}(${days[d.getDay()]})${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function fmtTime(ts) {
  if (!ts) return '--:--';
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

// ── auth state ─────────────────────────────────────────────────────
function resetAppState() {
  teardownPresence();
  destroyChatListener();
  if (presenceUnsub) { presenceUnsub(); presenceUnsub = null; }
  chatPostNum = 0;
}

function showFatalAuthError(message) {
  $loading.style.display = 'none';
  $authOverlay.style.display = 'flex';
  $app.style.display = 'none';
  setAuthFormsEnabled(false);
  $loginError.textContent = message;
  $signupError.textContent = message;
}

function bindAuthState() {
  onAuth(async (user) => {
    $loading.style.display = 'none';
    if (user) {
      if (bootstrappedUserId === user.id) return;
      resetAppState();
      currentUser = user;
      bootstrappedUserId = user.id;
      $authOverlay.style.display = 'none';
      $app.style.display = '';
      initApp();
    } else {
      resetAppState();
      currentUser = null;
      bootstrappedUserId = null;
      $app.style.display = 'none';
      $authOverlay.style.display = 'flex';
      setAuthFormsEnabled(true);
    }
  });
}

async function boot() {
  const backend = await checkBackendHealth();
  if (!backend.ok) {
    const message = backend.kind === 'network'
      ? 'auth backend is offline or misconfigured. update public/js/config.js with a live supabase project.'
      : backend.message;
    showFatalAuthError(message);
    console.error('backend health:', backend);
    return;
  }
  bindAuthState();
}

boot();

function initApp() {
  const username = getUsername(currentUser);
  $userDisplay.textContent = username;
  if ($postName) $postName.value = username;
  initChat(onChatMessage);
  setupPresence(currentUser.id, username);
  presenceUnsub = subscribeToPresence(onPresenceUpdate);
}

// ── navigation ─────────────────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(a => {
    const isActive = a.dataset.page === id;
    a.classList.toggle('active', isActive);
    if (isActive) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  // update title for SEO/UX
  const titles = { home: 'chat', forum: 'boards', about: 'keeper', links: 'graves' };
  document.title = `/goth/ — ${titles[id] || 'cemetery chatroom'}`;

  window.scrollTo({ top: 0, behavior: 'auto' });
  if (id === 'forum') loadForum();
}

document.querySelectorAll('.nav-link').forEach(l => {
  l.addEventListener('click', e => { e.preventDefault(); showPage(l.dataset.page); });
});

// ── chat ───────────────────────────────────────────────────────────
function onChatMessage(msg) {
  if (!$ircLog) return;
  const near = $ircLog.scrollHeight - $ircLog.clientHeight - $ircLog.scrollTop < 100;
  chatPostNum++;

  const post = document.createElement('div');
  post.className = 'chan-post';
  post.innerHTML =
    `<div class="chan-meta">` +
      `<span class="chan-name">${esc(msg.post_name || msg.username)}</span>` +
      `<span class="chan-stamp" title="${new Date(msg.created_at).toLocaleString()}">${chanDate(msg.created_at)}</span>` +
      `<span class="chan-num">No.${chatPostNum}</span>` +
    `</div>` +
    `<div class="chan-body">${esc(msg.text)}</div>`;

  $ircLog.appendChild(post);
  
  // limit visible messages to 100 for performance
  if ($ircLog.children.length > 100) $ircLog.removeChild($ircLog.firstChild);

  if (near || chatPostNum <= 10) $ircLog.scrollTop = $ircLog.scrollHeight;
}

$ircForm.addEventListener('submit', async e => {
  e.preventDefault();
  const text = $ircInput.value.trim();
  if (!text || !currentUser) return;
  const postName = ($postName?.value.trim()) || getUsername(currentUser);
  $ircInput.value = '';
  try { await sendMessage(currentUser.id, getUsername(currentUser), text, postName); }
  catch (err) { console.error('chat:', err); }
});

// ── presence sidebar ───────────────────────────────────────────────
const SKULL = `<span class="presence-glyph">&#x2020;</span>`;

function onPresenceUpdate(users) {
  $userList.innerHTML = '';
  const seen = new Set();
  users.forEach(u => {
    if (!u?.username || seen.has(u.username)) return;
    seen.add(u.username);
    const div = document.createElement('div');
    div.className = 'user';
    div.innerHTML = `${SKULL} ${esc(u.username)}`;
    $userList.appendChild(div);
  });
  $userCount.textContent = `${seen.size} online`;
}

// ── forum ──────────────────────────────────────────────────────────
async function loadForum() {
  try {
    const [feels, cult, net, lambda, cyb, dread, layer, vis] = await Promise.all([
      getThreadsByCategory('feels'),
      getThreadsByCategory('cult'),
      getThreadsByCategory('net'),
      getThreadsByCategory('lambda'),
      getThreadsByCategory('cyb'),
      getThreadsByCategory('dread'),
      getThreadsByCategory('layer'),
      getThreadsByCategory('vis')
    ]);
    renderList('feels',  feels);
    renderList('cult',   cult);
    renderList('net',    net);
    renderList('lambda', lambda);
    renderList('cyb',    cyb);
    renderList('dread',  dread);
    renderList('layer',  layer);
    renderList('vis',    vis);
  } catch (e) { console.error('forum load:', e); }
}

function renderList(cat, threads) {
  const tbody = document.getElementById('tbl-' + cat);
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!threads.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-row">no threads yet</td></tr>`;
    return;
  }
  threads.forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML =
      `<td><a href="#" class="topic-link">${esc(t.title)}</a></td>` +
      `<td class="replies meta">${t.reply_count || 0}</td>` +
      `<td class="last meta">${esc(t.last_post_user || '')} ${fmtTime(t.last_post_at)}</td>`;
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
  $threadPosts.innerHTML = '<div class="loading-row">loading...</div>';

  try {
    const posts = await getPosts(id);
    $replyCount.textContent = `${posts.length} posts`;
    $threadPosts.innerHTML = '';
    posts.forEach((p, i) => {
      const d = document.createElement('div');
      d.className = 'chan-post';
      d.innerHTML =
        `<div class="chan-meta">` +
          `<span class="chan-name">${esc(p.author_username)}</span>` +
          `<span class="chan-stamp">${chanDate(p.created_at)}</span>` +
          `<span class="chan-num">No.${i + 1}</span>` +
        `</div>` +
        `<div class="chan-body">${esc(p.content)}</div>`;
      $threadPosts.appendChild(d);
    });
  } catch (e) {
    $threadPosts.innerHTML = '<div class="loading-row">failed to load posts</div>';
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
    await createPost(currentUser.id, getUsername(currentUser), currentThread, text);
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
    const id = await createThread(currentUser.id, getUsername(currentUser), cat, title, body);
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
  try { await signIn(email, password); }
  catch (err) { $loginError.textContent = friendlyError(err.message); }
});

$signupForm.addEventListener('submit', async e => {
  e.preventDefault();
  $signupError.textContent = '';
  const username = document.getElementById('signup-username').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  try { await signUp(username, email, password); }
  catch (err) { $signupError.textContent = err.message; }
});

$logoutBtn.addEventListener('click', () => logOut());

function friendlyError(msg) {
  if (!msg) return 'something went wrong';
  if (msg.includes('Failed to fetch')) return 'auth backend is offline or misconfigured';
  if (msg.includes('fetch')) return 'network error talking to auth backend';
  if (msg.includes('Invalid login')) return 'not found in the dark';
  if (msg.includes('Email not confirmed')) return 'check your email to confirm';
  if (msg.includes('already registered')) return 'that email is already here';
  return msg;
}

// ── sound ──────────────────────────────────────────────────────────
const sigh = document.getElementById('sigh');
function playSigh() {
  try { sigh.volume = 0.3; sigh.currentTime = 0; sigh.play(); } catch (e) {}
}
document.body.addEventListener('mouseover', e => {
  if (e.target.closest('a, button, .btn, .topic-link, .grave-link, .nav-link')) playSigh();
});
