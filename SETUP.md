# cemetery chatroom — setup

backend: supabase (free, no credit card)
frontend: firebase hosting or netlify (both free)

---

## step 1: create supabase project

1. go to supabase.com → sign in with github
2. new project → name it, set a database password, pick a region
3. wait ~2 min for it to provision

---

## step 2: run the schema

1. supabase dashboard → sql editor → new query
2. paste the entire contents of `schema.sql`
3. click run

---

## step 3: enable email auth

supabase dashboard → authentication → providers → email → make sure it's enabled.

optional: disable "confirm email" if you don't want to set up smtp right now.
(settings → auth → email confirmations → turn off)

---

## step 4: get your credentials

supabase dashboard → project settings → api:
- copy `project url`
- copy `anon public` key

copy `public/js/config.example.js` to `public/js/config.js`, then paste both into `public/js/config.js`.

---

## step 5: deploy frontend

### option a: firebase hosting (already configured)

```bash
cd ~/Documents/DEVELOPMENT/cemeterychatroom
firebase deploy --only hosting
```

### option b: netlify (no cli needed)

drag the `public/` folder to netlify.com/drop

---

## notes

- supabase free tier: 500MB db, 2GB bandwidth, 50k monthly active users. no credit card.
- realtime chat uses supabase postgres changes (messages table).
- presence uses supabase realtime presence channels.
- if you want email confirmations on signup, set up smtp in supabase auth settings.
