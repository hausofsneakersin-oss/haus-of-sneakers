export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const id = searchParams.get('id');

  if (!id || typeof id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return new Response('Invalid file id', { status: 400 });
  }

  const driveUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download`;

  const headers = new Headers();
  headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
  const clientRange = context.request.headers.get('Range');
  if (clientRange) {
    headers.set('Range', clientRange);
  }

  try {
    const driveRes = await fetch(driveUrl, {
      headers,
      redirect: 'follow',
      cf: {
        cacheEverything: true,
        cacheTtl: 604800 // Cache for 7 days on Cloudflare edge
      }
    });

    const responseHeaders = new Headers(driveRes.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Accept-Ranges', 'bytes');
    responseHeaders.set('Cache-Control', 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400');
    responseHeaders.delete('Cross-Origin-Resource-Policy');

    return new Response(driveRes.body, {
      status: driveRes.status,
      headers: responseHeaders
    });
  } catch (err) {
    return new Response(err.message, { status: 502 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type'
    }
  });
}
