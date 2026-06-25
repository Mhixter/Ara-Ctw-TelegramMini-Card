/**
 * NairaVault — Cloudflare Worker
 *
 * Routes:
 *   /api/*  → proxied to RAILWAY_URL (set in Cloudflare Worker Variables)
 *   *       → served from static assets (the Vite build in ./dist)
 *
 * Required Cloudflare Variable:
 *   RAILWAY_URL  e.g. https://nairavault-production.up.railway.app
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      // ── Proxy to Railway backend ─────────────────────────────────────────────
      const railwayUrl = env.RAILWAY_URL;

      if (!railwayUrl) {
        return new Response(
          JSON.stringify({ error: 'Backend not configured (RAILWAY_URL missing)' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const target = new URL(url.pathname + url.search, railwayUrl);

      // Clone headers, strip host so Railway sees its own hostname
      const headers = new Headers(request.headers);
      headers.set('host', target.hostname);
      headers.set('x-forwarded-for', request.headers.get('cf-connecting-ip') || '');
      headers.set('x-forwarded-proto', 'https');

      const proxied = new Request(target.toString(), {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'follow',
      });

      try {
        const response = await fetch(proxied);
        // Re-attach CORS headers so the browser is happy
        const respHeaders = new Headers(response.headers);
        respHeaders.set('Access-Control-Allow-Origin', '*');
        respHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        respHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: respHeaders,
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: 'Backend unreachable', detail: err.message }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle CORS pre-flight for /api routes triggered before the path check
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // ── Serve static frontend ────────────────────────────────────────────────
    return env.ASSETS.fetch(request);
  },
};
