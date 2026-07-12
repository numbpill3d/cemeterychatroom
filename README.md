# /goth/ — cemetery chatroom

gothic imageboard-style social site. real-time chat, forum, and live presence.

**live:** https://cemeterychatroom.web.app

---

## what it is

a small social space built around a chan-board aesthetic. dark purple palette, MS Gothic font, scanlines. users sign up with a username, post in the live chat, and discuss things in the forum.

- **home** — real-time chatboard. posts show name, chan-style timestamp, and post number. name field lets you post under any name per message
- **forum** — three categories (graveyard gossip, music crypt, art and poetry). threads, replies, last-post tracking
- **sidebar** — live online user list via supabase realtime presence
- **background** — rotates randomly between six images every three hours, persisted in localStorage

---

## stack

| layer | tech |
|---|---|
| frontend | vanilla js (es modules), no build step |
| backend | supabase (postgres + realtime + auth) |
| hosting | firebase hosting |
| fonts | MS Gothic / DotGothic16 (google fonts fallback) |

---

## setup

see [SETUP.md](SETUP.md) for the full walkthrough. short version:

1. create a supabase project at supabase.com (free, no credit card)
2. run `schema.sql` in the supabase sql editor
3. turn off email confirmation in supabase auth settings
4. copy `public/js/config.example.js` to `public/js/config.js`
5. paste your supabase url and anon key into `public/js/config.js`
6. `firebase deploy --only hosting --project <your-project-id>`

or drop the `public/` folder on netlify.com/drop — supabase works from any host.

---

## local dev

needs a local http server (modules don't load over `file://`):

```bash
cd public
python3 -m http.server 8080
```

then open `localhost:8080`. requires `public/js/config.js` to exist and contain real supabase credentials.
