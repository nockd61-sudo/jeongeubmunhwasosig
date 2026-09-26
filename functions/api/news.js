export async function onRequestGet({ env }) {
  if (!env.ds) return Response.json({ news: [] });

  try {
    const { results = [] } = await env.ds.prepare(
      "SELECT title, source, url, published_at FROM news_items WHERE approved = 1 ORDER BY featured_order ASC, published_at DESC LIMIT 3"
    ).all();

    return Response.json(
      { news: results },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch (error) {
    console.error("뉴스 조회 실패", error);
    return Response.json({ news: [] });
  }
}
