// Cloudflare Worker entry point — API proxy for PitFusion (hosted mode).
//
// Static files in public/ are served directly by Workers Static Assets. This
// script only runs for /api/* (see `run_worker_first` in wrangler.toml). Each
// /api/<svc>/* request is forwarded to the real API with the key injected from
// a secret, so no key ever reaches the browser.

const ROUTES = {
  '/api/nexus':   { upstream: 'https://frc.nexus/api/v1',               header: 'Nexus-Api-Key',  env: 'NEXUS_API_KEY',   cache: 10 },
  '/api/tba':     { upstream: 'https://www.thebluealliance.com/api/v3', header: 'X-TBA-Auth-Key', env: 'TBA_API_KEY',     cache: 30 },
  '/api/youtube': { upstream: 'https://www.googleapis.com/youtube/v3',  query:  'key',            env: 'YOUTUBE_API_KEY', cache: 60 },
};

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
    const secret = env[route.env];
    if (!secret) {
      return new Response(`Proxy misconfigured: ${route.env} is not set`, { status: 500 });
    }

    const path = url.pathname.slice(prefix.length);
    const params = new URLSearchParams(url.search);
    if (route.query) params.set(route.query, secret);
    const qs = params.toString();
    const upstreamUrl = route.upstream + path + (qs ? `?${qs}` : '');

    const cache = caches.default;
    const cacheKey = new Request(upstreamUrl, { method: 'GET' });
    let response = await cache.match(cacheKey);

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
        upstream.ok ? `public, max-age=${route.cache}` : 'no-store'
      );
      if (upstream.ok) ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    const out = new Response(response.body, response);
    out.headers.set('Access-Control-Allow-Origin', '*');
    return out;
  },
};
