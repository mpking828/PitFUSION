// Shared proxy helper for PitFusion's API Functions.
//
// Each route (nexus, tba, youtube) calls proxy() with an upstream base URL and
// the secret to inject. The browser never sees a key — it calls /api/<svc>/*
// on our own origin and this Function forwards the request with the key added.
//
// Files/dirs starting with "_" are not treated as routes by Cloudflare Pages,
// so this module is import-only.

const ALLOWED_HOST_SUFFIXES = ['.pitfusion.com', '.pages.dev'];
const ALLOWED_HOSTS = ['pitfusion.com'];

function originAllowed(request) {
  // Same-origin GETs often omit Origin entirely — allow those.
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  let host;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  if (ALLOWED_HOSTS.includes(host)) return true;
  return ALLOWED_HOST_SUFFIXES.some((s) => host.endsWith(s));
}

/**
 * @param {EventContext} context  Cloudflare Pages Function context
 * @param {object} opts
 * @param {string} opts.upstream      Upstream API base, no trailing slash (e.g. https://frc.nexus/api/v1)
 * @param {object} [opts.headers]     Headers to inject on the upstream request (e.g. auth key)
 * @param {object} [opts.query]       Query params to inject (e.g. { key: <secret> } for YouTube)
 * @param {number} opts.cacheSeconds  Edge cache TTL for successful responses
 */
export async function proxy(context, opts) {
  const { request } = context;
  const url = new URL(request.url);

  if (!originAllowed(request)) {
    return new Response('Forbidden', { status: 403 });
  }

  // Strip the "/api/<svc>" prefix; the rest is the upstream path.
  const path = url.pathname.replace(/^\/api\/[^/]+/, '');

  const params = new URLSearchParams(url.search);
  for (const [k, v] of Object.entries(opts.query || {})) {
    if (v == null || v === '') {
      return new Response(`Proxy misconfigured: missing secret for ${k}`, { status: 500 });
    }
    params.set(k, v);
  }
  const qs = params.toString();
  const upstreamUrl = opts.upstream + path + (qs ? `?${qs}` : '');

  // Guard against a missing header secret too.
  for (const [k, v] of Object.entries(opts.headers || {})) {
    if (v == null || v === '') {
      return new Response(`Proxy misconfigured: missing secret for ${k}`, { status: 500 });
    }
  }

  const cache = caches.default;
  // Cache key ignores our own request headers; the upstream URL fully identifies the resource.
  const cacheKey = new Request(upstreamUrl, { method: 'GET' });

  let response = await cache.match(cacheKey);
  if (!response) {
    let upstream;
    try {
      upstream = await fetch(upstreamUrl, {
        headers: { Accept: 'application/json', ...(opts.headers || {}) },
      });
    } catch (e) {
      return new Response(`Upstream fetch failed: ${e.message}`, { status: 502 });
    }

    response = new Response(upstream.body, upstream);
    response.headers.delete('set-cookie');
    response.headers.set(
      'Cache-Control',
      upstream.ok ? `public, max-age=${opts.cacheSeconds}` : 'no-store'
    );

    if (upstream.ok) {
      context.waitUntil(cache.put(cacheKey, response.clone()));
    }
  }

  // Same-origin in production, but be permissive so preview URLs and file:// testing work.
  const out = new Response(response.body, response);
  out.headers.set('Access-Control-Allow-Origin', '*');
  return out;
}

export function onRequestOptions() {
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
