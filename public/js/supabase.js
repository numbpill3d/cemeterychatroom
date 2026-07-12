import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function looksConfigured(value, placeholder) {
  return Boolean(value) && value !== placeholder;
}

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
