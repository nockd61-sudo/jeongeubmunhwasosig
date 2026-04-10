function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

function normalizeRow(row) {
  return {
    id: String(row.id),
    postId: String(row.post_id),
    author: row.author || '',
    text: row.text || '',
    date: row.date || '',
    createdAt: row.created_at || ''
  };
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestGet(context) {
  try {
    const { results } = await context.env.DB.prepare(`
      SELECT id, post_id, author, text, date, created_at
      FROM comments
      ORDER BY datetime(created_at) DESC
    `).all();

    return json(results.map(normalizeRow));
  } catch (error) {
    return json({ error: '댓글 조회 실패', detail: error.message }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const id = String(body.id || `c-${Date.now()}`);
    const postId = String(body.postId || body.post_id || '').trim();
    const author = String(body.author || '').trim();
    const text = String(body.text || '').trim();
    const date = String(body.date || new Date().toISOString().slice(0, 10)).trim();
    const createdAt = String(body.createdAt || new Date().toISOString()).trim();

    if (!postId || !author || !text) {
      return json({ error: 'postId, author, text는 필수입니다.' }, 400);
    }

    await context.env.DB.prepare(`
      INSERT INTO comments (id, post_id, author, text, date, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, postId, author, text, date, createdAt).run();

    return json({ ok: true, id, postId, author, text, date, createdAt });
  } catch (error) {
    return json({ error: '댓글 저장 실패', detail: error.message }, 500);
  }
}
