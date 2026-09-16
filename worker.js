// Cloudflare Worker entry point — API proxy for PitFusion (hosted mode).
//
// Static files in public/ are served directly by Workers Static Assets. This
// script only runs for /api/* (see `run_worker_first` in wrangler.toml). Each
// /api/<svc>/* request is forwarded to the real API with the key injected from
// a secret, so no key ever reaches the browser.

const ROUTES = {
  '/api/nexus':      { upstream: 'https://frc.nexus/api/v1',               header: 'Nexus-Api-Key',  env: 'NEXUS_API_KEY',   cache: 10 },
  '/api/tba':        { upstream: 'https://www.thebluealliance.com/api/v3', header: 'X-TBA-Auth-Key', env: 'TBA_API_KEY',     cache: 30 },
  '/api/youtube':    { upstream: 'https://www.googleapis.com/youtube/v3',  query:  'key',            env: 'YOUTUBE_API_KEY', cache: 60 },
  // Keyless — no header/env/query. Every team watching the same event shares one
  // cached response instead of each browser hitting Statbotics independently.
  // `bustCache` applies only when the client sent a `_cb` version (see below): a
  // versioned URL is immutable by construction, so it can be held far longer than
  // the blind 120s a plain URL gets. A client on a stale cached index.html sends no
  // `_cb` and correctly falls back to `cache`.
  '/api/statbotics': { upstream: 'https://api.statbotics.io/v3',                                     cache: 120, bustCache: 3600 },
};

// Client-supplied cache version (see sbUrl() in public/index.html). It must NOT
// reach the upstream API — Statbotics never declared it — but it MUST vary the edge
// cache key, which is the only way a client that knows its data is stale can punch
// through Cloudflare's cache: the Cache API offers no push invalidation, only lazy
// match/put by URL, and a KV or Durable Object binding is something this project has
// deliberately stayed without. Every display at an event derives the same value from
// the same TBA state, so they still share one entry.
const CACHE_BUST_PARAM = '_cb';

const ALLOWED_HOSTS = ['pitfusion.com'];
const ALLOWED_SUFFIXES = ['.pitfusion.com', '.workers.dev', '.pages.dev'];

function originAllowed(request) {
  // Same-origin GETs usually omit Origin — allow those.
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  let host;
  try { host = new URL(origin).hostname; } catch { return false; }
  return ALLOWED_HOSTS.includes(host) || ALLOWED_SUFFIXES.some((s) => host.endsWith(s));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const prefix = Object.keys(ROUTES).find(
      (p) => url.pathname === p || url.pathname.startsWith(p + '/')
    );

    // Non-/api paths shouldn't reach here (run_worker_first is scoped), but
    // fall through to static assets if they do.
    if (!prefix) {
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
    if (!originAllowed(request)) return new Response('Forbidden', { status: 403 });

    const route = ROUTES[prefix];
    // Only routes that declare `env` need a secret — e.g. /api/statbotics is keyless
    // and has no env/header/query at all, so there's nothing to require here.
    const secret = route.env ? env[route.env] : null;
    if (route.env && !secret) {
      return new Response(`Proxy misconfigured: ${route.env} is not set`, { status: 500 });
    }

    const path = url.pathname.slice(prefix.length);
    const params = new URLSearchParams(url.search);
    const bust = params.get(CACHE_BUST_PARAM);
    params.delete(CACHE_BUST_PARAM);
    if (route.query) params.set(route.query, secret);
    const qs = params.toString();
    const upstreamUrl = route.upstream + path + (qs ? `?${qs}` : '');

    // The cache key re-adds `_cb` that the upstream URL just dropped, so the version
    // partitions the edge cache without ever being sent to the API. This URL is only
    // ever a key; it is never fetched.
    const cacheUrl =
      bust === null
        ? upstreamUrl
        : upstreamUrl +
          (upstreamUrl.includes('?') ? '&' : '?') +
          `${CACHE_BUST_PARAM}=${encodeURIComponent(bust)}`;
    const maxAge = (bust !== null && route.bustCache) || route.cache;

    // Edge cache is best-effort — if the Cache API is unavailable or disabled,
    // fall straight through to the upstream fetch.
    const cacheKey = new Request(cacheUrl, { method: 'GET' });
    let cache = null;
    let response = null;
    try {
      cache = caches.default;
      response = await cache.match(cacheKey);
    } catch (e) {
      cache = null;
    }

    if (!response) {
      const headers = { Accept: 'application/json' };
      if (route.header) headers[route.header] = secret;

      let upstream;
      try {
        upstream = await fetch(upstreamUrl, { headers });
      } catch (e) {
        return new Response(`Upstream fetch failed: ${e.message}`, { status: 502 });
      }

      response = new Response(upstream.body, upstream);
      response.headers.delete('set-cookie');
      response.headers.set(
        'Cache-Control',
        upstream.ok ? `public, max-age=${maxAge}` : 'no-store'
      );
      if (upstream.ok && cache) {
        try { ctx.waitUntil(cache.put(cacheKey, response.clone())); } catch (e) { /* ignore */ }
      }
    }

    const out = new Response(response.body, response);
    out.headers.set('Access-Control-Allow-Origin', '*');
    return out;
  },
};
