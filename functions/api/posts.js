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
    title: row.title || '',
    content: row.content || '',
    description: row.content || '',
    mediaType: row.media_type || 'image',
    mediaUrl: row.media_url || '',
    imageUrl: row.media_url || '',
    startDate: row.start_date || '',
    date: row.start_date || '',
    endDate: row.end_date || row.start_date || '',
    place: row.place || '',
    author: row.author || '시민',
    likes: Number(row.likes || 0),
    views: Number(row.views || 0),
    lastViewedAt: row.last_viewed_at || '',
    createdAt: row.created_at || ''
  };
}

async function listPosts(env) {
  const { results } = await env.DB.prepare(`
    SELECT id, title, content, media_type, media_url, start_date, end_date, place, author,
           likes, views, last_viewed_at, created_at
    FROM posts
    ORDER BY datetime(created_at) DESC
  `).all();

  return results.map(normalizeRow);
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestGet(context) {
  try {
    const posts = await listPosts(context.env);
    return json(posts);
  } catch (error) {
    return json({ error: '게시글 조회 실패', detail: error.message }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const id = String(body.id || Date.now());
    const title = String(body.title || '').trim();
    const content = String(body.content || body.description || '').trim();
    const mediaType = String(body.mediaType || 'image').trim();
    const mediaUrl = String(body.mediaUrl || body.imageUrl || '').trim();
    const startDate = String(body.startDate || body.date || '').trim();
    const endDate = String(body.endDate || body.startDate || body.date || '').trim();
    const place = String(body.place || '').trim();
    const author = String(body.author || '시민').trim();
    const createdAt = String(body.createdAt || new Date().toISOString()).trim();

    if (!title || !mediaUrl || !startDate) {
      return json({ error: '제목, 이미지 주소, 시작일은 필수입니다.' }, 400);
    }

    await context.env.DB.prepare(`
      INSERT INTO posts (
        id, title, content, media_type, media_url,
        start_date, end_date, place, author,
        likes, views, last_viewed_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, '', ?)
    `).bind(
      id, title, content, mediaType, mediaUrl,
      startDate, endDate, place, author, createdAt
    ).run();

    return json({ ok: true, id });
  } catch (error) {
    return json({ error: '게시글 저장 실패', detail: error.message }, 500);
  }
}

export async function onRequestPatch(context) {
  try {
    const body = await context.request.json();
    const id = String(body.id || '').trim();
    const action = String(body.action || '').trim();

    if (!id || !['view', 'like'].includes(action)) {
      return json({ error: 'id와 action(view|like)이 필요합니다.' }, 400);
    }

    if (action === 'view') {
      const now = new Date().toISOString();
      await context.env.DB.prepare(`
        UPDATE posts
        SET views = COALESCE(views, 0) + 1,
            last_viewed_at = ?
        WHERE id = ?
      `).bind(now, id).run();

      const row = await context.env.DB.prepare(`
        SELECT views, last_viewed_at FROM posts WHERE id = ?
      `).bind(id).first();

      return json({ ok: true, views: Number(row?.views || 0), lastViewedAt: row?.last_viewed_at || now });
    }

    await context.env.DB.prepare(`
      UPDATE posts
      SET likes = COALESCE(likes, 0) + 1
      WHERE id = ?
    `).bind(id).run();

    const row = await context.env.DB.prepare(`
      SELECT likes FROM posts WHERE id = ?
    `).bind(id).first();

    return json({ ok: true, likes: Number(row?.likes || 0) });
  } catch (error) {
    return json({ error: '게시글 상호작용 업데이트 실패', detail: error.message }, 500);
  }
}

export async function onRequestDelete(context) {
  try {
    let id = new URL(context.request.url).searchParams.get('id') || '';

    if (!id) {
      try {
        const body = await context.request.json();
        id = String(body?.id || '').trim();
      } catch {
        id = '';
      }
    }

    if (!id) {
      return json({ error: '삭제할 게시글 id가 필요합니다.' }, 400);
    }

    await context.env.DB.prepare('DELETE FROM comments WHERE post_id = ?').bind(id).run();
    await context.env.DB.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();

    return json({ ok: true, id });
  } catch (error) {
    return json({ error: '게시글 삭제 실패', detail: error.message }, 500);
  }
}
