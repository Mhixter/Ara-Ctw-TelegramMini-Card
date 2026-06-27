export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);
  const railwayUrl = env.RAILWAY_URL;

  if (!railwayUrl) {
    return new Response(
      JSON.stringify({ error: 'Backend not configured (RAILWAY_URL missing)' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  const pathSegments = params.path ? (Array.isArray(params.path) ? params.path : [params.path]) : [];
  const target = new URL(
    '/api/' + pathSegments.join('/') + url.search,
    railwayUrl.replace(/\/+$/, '')
  );

  const headers = new Headers(request.headers);
  headers.set('host', target.hostname);
  headers.set('x-forwarded-for', request.headers.get('cf-connecting-ip') || '');
  headers.set('x-forwarded-proto', 'https');

  try {
    const resp = await fetch(new Request(target.toString(), {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    }));

    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get('Location');
      if (location) return Response.redirect(location, resp.status);
    }

    const out = new Headers(resp.headers);
    out.set('Access-Control-Allow-Origin', '*');
    out.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    out.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: out,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Backend unreachable', detail: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
