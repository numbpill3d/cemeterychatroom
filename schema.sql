-- run this entire file in supabase → sql editor → new query

create extension if not exists "uuid-ossp";

-- user profiles (username storage)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text not null,
  created_at timestamptz default now()
);
create unique index profiles_username_lower_idx on profiles (lower(username));

-- chat messages
create table messages (
  id bigserial primary key,
  user_id uuid references auth.users(id),
  username text not null,
  post_name text not null,
  text text not null,
  created_at timestamptz default now()
);

-- forum threads
create table threads (
  id uuid default uuid_generate_v4() primary key,
  category text not null check (category in ('feels', 'cult', 'net')),
  title text not null,
  author_uid uuid references auth.users(id),
  author_username text not null,
  created_at timestamptz default now(),
  last_post_at timestamptz default now(),
  last_post_user text not null,
  reply_count integer default 1
);

-- forum posts
create table posts (
  id uuid default uuid_generate_v4() primary key,
  thread_id uuid references threads(id) on delete cascade,
  author_uid uuid references auth.users(id),
  author_username text not null,
  content text not null,
  created_at timestamptz default now()
);

-- row level security
alter table profiles enable row level security;
alter table messages enable row level security;
alter table threads enable row level security;
alter table posts enable row level security;

-- profiles: public read (needed for username availability check), own insert
create policy "profiles public read"  on profiles for select using (true);
create policy "profiles own insert"   on profiles for insert with check (auth.uid() = id);

-- messages: auth read/insert
create policy "messages auth read"    on messages for select using (auth.role() = 'authenticated');
create policy "messages own insert"   on messages for insert with check (auth.uid() = user_id);

-- threads: auth read, own insert, auth update (for reply counts)
create policy "threads auth read"     on threads for select using (auth.role() = 'authenticated');
create policy "threads own insert"    on threads for insert with check (auth.uid() = author_uid);
create policy "threads auth update"   on threads for update using (auth.role() = 'authenticated');

-- posts: auth read, own insert
create policy "posts auth read"       on posts for select using (auth.role() = 'authenticated');
create policy "posts own insert"      on posts for insert with check (auth.uid() = author_uid);

-- enable realtime for chat messages
alter publication supabase_realtime add table messages;
