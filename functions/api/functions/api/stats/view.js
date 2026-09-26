export async function onRequestPost({ env }) {
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

    await db.prepare(
      'INSERT INTO site_views (day, count) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET count = count + 1'
    ).bind(today).run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: String(error.message || error) }, { status: 500 });
  }
}
