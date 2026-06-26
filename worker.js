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

    // ── CORS pre-flight ────────────────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (url.pathname.startsWith('/api/')) {
      // ── Proxy to Railway backend ──────────────────────────────────────────────
      const railwayUrl = env.RAILWAY_URL;

      if (!railwayUrl) {
        return new Response(
          JSON.stringify({ error: 'Backend not configured (RAILWAY_URL missing)' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const target = new URL(url.pathname + url.search, railwayUrl);

      const headers = new Headers(request.headers);
      headers.set('host', target.hostname);
      headers.set('x-forwarded-for', request.headers.get('cf-connecting-ip') || '');
      headers.set('x-forwarded-proto', 'https');

      const proxied = new Request(target.toString(), {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        // 'manual' lets Railway's 302 redirects (Google OAuth) pass through to the browser
        redirect: 'manual',
      });

      try {
        const response = await fetch(proxied);

        // Pass redirects (Google OAuth flow) straight back to the browser
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('Location');
          if (location) {
            return Response.redirect(location, response.status);
          }
        }

        // Normal response — add CORS headers
        const respHeaders = new Headers(response.headers);
        respHeaders.set('Access-Control-Allow-Origin', '*');
        respHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
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

    // ── Serve static frontend ──────────────────────────────────────────────────
    return env.ASSETS.fetch(request);
  },
};
