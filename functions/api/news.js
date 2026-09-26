export async function onRequestGet({ env }) {
  if (!env.ds) return Response.json({ news: [] });

  try {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const { results = [] } = await env.ds.prepare(
      'SELECT title, source, url, published_at FROM news_items WHERE approved_day = ? ORDER BY featured_order ASC LIMIT 3'
    ).bind(today).all();

    return Response.json(
      { news: results },
      { headers: { 'Cache-Control': 'public, max-age=60' } }
    );
  } catch (error) {
    console.error('뉴스 조회 실패', error);
    return Response.json({ news: [] });
  }
}
