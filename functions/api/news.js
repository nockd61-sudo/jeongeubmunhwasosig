export async function onRequestGet({ env, request }) {
  if (!env.ds) return Response.json({ news: [] });
  try {
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (Number.isSafeInteger(id) && id > 0) {
      const article = await env.ds.prepare('SELECT id, article_title AS title, article_summary AS summary, article_body AS body, source, url AS source_url, published_at, approved_day FROM news_items WHERE id = ? AND approved_day IS NOT NULL AND article_body IS NOT NULL').bind(id).first();
      return Response.json(article ? { article } : { error: '기사를 찾을 수 없습니다.' }, { status: article ? 200 : 404, headers: { 'Cache-Control': 'public, max-age=60' } });
    }
    const { results = [] } = await env.ds.prepare('SELECT id, article_title AS title, article_summary AS summary, source, published_at FROM news_items WHERE approved_day = ? AND article_body IS NOT NULL ORDER BY featured_order ASC LIMIT 3').bind(today).all();
    return Response.json({ news: results }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (error) {
    console.error("뉴스 조회 실패", error);
    return Response.json({ news: [] });
  }
}
