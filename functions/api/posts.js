function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function normalizeRow(row) {
  const mediaUrl = row.mediaUrl || row.imageUrl || '';

  return {
    id: String(row.id),
    title: row.title || '',
    content: row.content || '',
    description: row.content || '',

    mediaType: row.mediaType || 'image',
    mediaUrl: mediaUrl,
    imageUrl: mediaUrl,

    startDate: row.startDate || '',
    date: row.startDate || '',
    endDate: row.endDate || row.startDate || '',

    place: row.place || '',
    author: row.author || '시민',

    likes: Number(row.likes || 0),
    views: Number(row.views || 0),

    createdAt: row.createdAt || row.created_at || ''
  };
}

async function listPosts(env) {
  if (!env.ds) {
    throw new Error('D1 binding DB가 연결되어 있지 않습니다.');
  }

  const { results } = await env.ds
    
    .prepare(`
    SELECT
      id,
      title,
      content,
      mediaType,
      mediaUrl,
      startDate,
      endDate,
      place,
      author,
      created_at,
      imageUrl,
      createdAt,
      views,
      likes
    FROM posts
    ORDER BY COALESCE(createdAt, created_at, startDate) DESC
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
    return json({
      error: '게시글 조회 실패',
      detail: error.message
    }, 500);
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
    const endDate = String(
      body.endDate || body.startDate || body.date || ''
    ).trim();
    const place = String(body.place || '').trim();
    const author = String(body.author || '시민').trim();
    const createdAt = String(
      body.createdAt || new Date().toISOString()
    ).trim();

    if (!title || !startDate) {
      return json({
        error: '제목과 시작일은 필수입니다.'
      }, 400);
    }

    await context.env.ds.prepare(`
      INSERT INTO posts (
        id,
        title,
        content,
        mediaType,
        mediaUrl,
        startDate,
        endDate,
        place,
        author,
        created_at,
        imageUrl,
        createdAt,
        views,
        likes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `).bind(
      id,
      title,
      content,
      mediaType,
      mediaUrl,
      startDate,
      endDate,
      place,
      author,
      createdAt,
      mediaUrl,
      createdAt
    ).run();

    return json({
      ok: true,
      id: id
    });

  } catch (error) {
    return json({
      error: '게시글 저장 실패',
      detail: error.message
    }, 500);
  }
}

export async function onRequestPatch(context) {
  try {
    const body = await context.request.json();

    const id = String(body.id || '').trim();
    const action = String(body.action || '').trim();

    if (!id || !['view', 'like'].includes(action)) {
      return json({
        error: 'id와 action(view|like)이 필요합니다.'
      }, 400);
    }

    if (action === 'view') {
      await context.env.ds.prepare(`
        UPDATE posts
        SET views = COALESCE(views, 0) + 1
        WHERE id = ?
      `).bind(id).run();

      const row = await context.env.ds.prepare(`
        SELECT views
        FROM posts
        WHERE id = ?
      `).bind(id).first();

      return json({
        ok: true,
        views: Number(row?.views || 0)
      });
    }

    await context.env.ds.prepare(`
      UPDATE posts
      SET likes = COALESCE(likes, 0) + 1
      WHERE id = ?
    `).bind(id).run();

    const row = await context.env.ds.prepare(`
      SELECT likes
      FROM posts
      WHERE id = ?
    `).bind(id).first();

    return json({
      ok: true,
      likes: Number(row?.likes || 0)
    });

  } catch (error) {
    return json({
      error: '게시글 업데이트 실패',
      detail: error.message
    }, 500);
  }
}

export async function onRequestDelete(context) {
  try {
    let id =
      new URL(context.request.url).searchParams.get('id') || '';

    if (!id) {
      try {
        const body = await context.request.json();
        id = String(body?.id || '').trim();
      } catch {
        id = '';
      }
    }

    if (!id) {
      return json({
        error: '삭제할 게시글 id가 필요합니다.'
      }, 400);
    }

    await context.env.ds.prepare(`
      DELETE FROM comments
      WHERE post_id = ?
    `).bind(id).run();

    await context.env.ds.prepare(`
      DELETE FROM posts
      WHERE id = ?
    `).bind(id).run();

    return json({
      ok: true,
      id: id
    });

  } catch (error) {
    return json({
      error: '게시글 삭제 실패',
      detail: error.message
    }, 500);
  }
}
