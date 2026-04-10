function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestPost(context) {
  try {
    const formData = await context.request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return json({ error: '파일이 없습니다.' }, 400);
    }

    if (!context.env.BUCKET) {
      return json({ error: 'R2 바인딩(BUCKET)이 없습니다.' }, 500);
    }

    if (!file.type.startsWith('image/')) {
      return json({ error: '이미지 파일만 업로드할 수 있습니다.' }, 400);
    }

    const safeName = (file.name || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `uploads/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const arrayBuffer = await file.arrayBuffer();

    await context.env.BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type
      }
    });

    const publicBase = String(context.env.PUBLIC_R2_BASE_URL || '').replace(/\/$/, '');
    if (!publicBase) {
      return json({ error: 'PUBLIC_R2_BASE_URL 환경 변수가 없습니다.' }, 500);
    }

    return json({ ok: true, key, url: `${publicBase}/${key}` });
  } catch (error) {
    return json({ error: '업로드 실패', detail: error.message }, 500);
  }
}
