# cemetery chatroom — setup guide

## what was built

a fully functional social site with:
- firebase auth (sign up / log in with email + username display)
- realtime chat (firebase realtime database, persists across sessions)
- forum with threads + replies (firestore)
- live online user list (rtdb presence system)
- auto-seeded with the original example threads on first launch

---

## step 1: create a firebase project

1. go to [console.firebase.google.com](https://console.firebase.google.com)
2. click **add project**, name it whatever (e.g. `cemeterychatroom`)
3. disable google analytics if you want (not needed here)

---

## step 2: enable services

### authentication
- firebase console → **build → authentication → get started**
- sign-in method tab → enable **email/password**

### firestore database
- **build → firestore database → create database**
- start in **production mode** (rules are already written)
- pick any region (us-central1 is fine)

### realtime database
- **build → realtime database → create database**
- start in **test mode** for now (you'll deploy real rules via cli)
- pick your region

---

## step 3: get your config

- **project settings** (gear icon) → **your apps** → **add app** → web
- register the app (any nickname)
- copy the `firebaseConfig` object shown

paste it into `public/js/config.js`, replacing all the `YOUR_*` placeholders.

---

## step 4: deploy

### option a: firebase hosting (recommended)

```bash
npm install -g firebase-tools
firebase login
firebase init
```

when prompted:
- select: **hosting, firestore, realtime database**
- use existing project → select your project
- public directory: `public`
- single-page app: **yes**
- overwrite index.html: **no**

then:

```bash
firebase deploy
```

this deploys hosting + firestore rules + rtdb rules + the composite index.

---

### option b: netlify (frontend only)

drag the `public/` folder to [netlify.com/drop](https://app.netlify.com/drop) or use the netlify cli.

the firebase backend (auth, firestore, rtdb) still works — the frontend js connects directly to firebase regardless of where it's hosted.

if deploying to netlify, create the composite index manually in the firebase console:
- firestore → indexes → add index
- collection: `threads`, fields: `category` (asc) + `lastPostAt` (desc)

---

## notes

- forum is seeded with example threads on first visit. tracked via `metadata/seeded` in firestore — won't repeat.
- usernames are unique (checked at signup). login uses email + password; display name is always the username.
- firebase sdk version used: `10.14.0` — if any cdn url fails, update the version string in all `public/js/*.js` files.
- the site is mobile-responsive (single column below 880px).
