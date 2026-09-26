export async function onRequestGet({ env }) {
  try {
    const db = env.ds;
    if (!db) throw new Error('D1 연결 ds가 없습니다.');

    await db.prepare(
      'CREATE TABLE IF NOT EXISTS site_views (day TEXT PRIMARY KEY, count INTEGER DEFAULT 0)'
    ).run();

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());

    const total = await db.prepare(
      'SELECT COALESCE(SUM(count), 0) AS value FROM site_views'
    ).first();

    const daily = await db.prepare(
      'SELECT count AS value FROM site_views WHERE day = ?'
    ).bind(today).first();

    return Response.json({
      total_views: Number(total?.value || 0),
      today_views: Number(daily?.value || 0)
    });
  } catch (error) {
    return Response.json({ error: String(error.message || error) }, { status: 500 });
  }
}
