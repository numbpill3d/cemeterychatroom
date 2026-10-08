import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// config.js is gitignored (holds the anon key), so it may not exist on a
// fresh clone or if it was never copied from config.example.js.
// A static import would fail the entire module graph and leave every
// button dead, so load it dynamically with safe placeholders instead.
let SUPABASE_URL = 'YOUR_SUPABASE_URL';
let SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

try {
  const cfg = await import('./config.js');
  if (cfg.SUPABASE_URL) SUPABASE_URL = cfg.SUPABASE_URL;
  if (cfg.SUPABASE_ANON_KEY) SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY;
} catch (e) {
  console.warn('public/js/config.js missing — copy public/js/config.example.js to public/js/config.js', e);
}

function looksConfigured(value, placeholder) {
  return Boolean(value) && value !== placeholder;
}

const configured =
  looksConfigured(SUPABASE_URL, 'YOUR_SUPABASE_URL') &&
  looksConfigured(SUPABASE_ANON_KEY, 'YOUR_SUPABASE_ANON_KEY');

function missingBackendError() {
  return new Error('supabase backend is not configured: copy public/js/config.example.js to public/js/config.js');
}

// When unconfigured, export a stub that throws a clear error instead of
// breaking the module import. app.js boot() checks checkBackendHealth()
// first and shows the message, so this stub is never used on a healthy boot.
function stubMethod() {
  throw missingBackendError();
}

export const supabase = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : {
      from: stubMethod,
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signUp: stubMethod,
        signInWithPassword: stubMethod,
        signOut: stubMethod
      },
      channel: () => ({
        on: () => ({ subscribe: () => ({}) }),
        subscribe: () => ({}),
        track: stubMethod,
        untrack: async () => ({})
      }),
      removeChannel: () => {}
    };

export function getBackendConfigError() {
  if (!looksConfigured(SUPABASE_URL, 'YOUR_SUPABASE_URL')) {
    return 'supabase url is missing in public/js/config.js';
  }
  if (!looksConfigured(SUPABASE_ANON_KEY, 'YOUR_SUPABASE_ANON_KEY')) {
    return 'supabase anon key is missing in public/js/config.js';
  }
  return null;
}

export async function checkBackendHealth() {
  const configError = getBackendConfigError();
  if (configError) {
    return { ok: false, message: configError, kind: 'config' };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });

    if (!res.ok) {
      return {
        ok: false,
        kind: 'http',
        status: res.status,
        message: `supabase auth settings probe failed (${res.status})`
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      kind: 'network',
      message: `supabase backend unreachable: ${error?.message || error}`
    };
  }
}
