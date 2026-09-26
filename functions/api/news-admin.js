const cookieName = 'jeongeup_news_admin';
const encoder = new TextEncoder();

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

function day() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

function equal(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

async function authorized(request, env) {
  const cookie = request.headers.get('Cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!cookie || !env.NEWS_ADMIN_PASSWORD) return false;
  const [expiry, signature] = cookie.split('.');
  if (!expiry || !signature || Number(expiry) < Date.now() || Number(expiry) > Date.now() + 86400000) return false;
  return equal(signature, await sign(expiry, env.NEWS_ADMIN_PASSWORD));
}

async function init(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS news_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    published_at TEXT NOT NULL,
    approved_day TEXT,
    featured_order INTEGER NOT NULL DEFAULT 99,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS news_login_attempts (
    ip TEXT PRIMARY KEY, attempts INTEGER NOT NULL DEFAULT 0, first_attempt INTEGER NOT NULL
  )`).run();
  const columns = await db.prepare('PRAGMA table_info(news_items)').all();
  const names = new Set((columns.results || []).map(column => column.name));
  for (const [name, type] of [['article_title', 'TEXT'], ['article_summary', 'TEXT'], ['article_body', 'TEXT'], ['article_reviewed', 'INTEGER NOT NULL DEFAULT 0']]) {
    if (!names.has(name)) await db.prepare(`ALTER TABLE news_items ADD COLUMN ${name} ${type}`).run();
  }
}

function readableText(html) {
  const description = [...html.matchAll(/<meta\s+[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']+)["']/gi)]
    .map(match => decodeXml(match[1]));
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || html;
  const paragraphs = [...article.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map(match => decodeXml(match[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()))
    .filter(value => value.length >= 35).slice(0, 24);
  return [...description, ...paragraphs].join('\n').slice(0, 10000);
}

async function sourceText(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !/^(news\.google\.com|[a-z\d.-]+)$/i.test(parsed.hostname)) throw new Error('원문 주소가 올바르지 않습니다.');
  const response = await fetch(url, { signal: AbortSignal.timeout(12000), redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JeongeupCultureNews/1.0)' } });
  if (!response.ok || !response.headers.get('content-type')?.includes('html')) throw new Error('원문 내용을 읽을 수 없습니다. 다른 기사를 선택해 주세요.');
  const html = (await response.text()).slice(0, 300000);
  const content = readableText(html);
  if (content.length < 450) throw new Error('원문에서 확인할 정보가 부족합니다. 다른 기사를 선택해 주세요.');
  return content;
}

async function draft(row, ai) {
  if (!ai) throw new Error('Cloudflare Workers AI 바인딩 AI를 먼저 연결해 주세요.');
  const content = await sourceText(row.url);
  const result = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
    messages: [
      { role: 'system', content: '당신은 정읍문화소식 편집자입니다. 제공된 원문 텍스트에 명시된 사실만 사용하여 한국어 지역 뉴스를 새 문장으로 작성하세요. 추측, 인용문 창작, 원문 문장 복사를 금지합니다. 내용이 부족하면 ERROR만 출력하세요. 제목 1줄, 요약 1줄, 본문 2~3문단을 아래 JSON만으로 출력하세요: {"title":"...","summary":"...","body":"..."}. 출처 표시는 별도로 처리합니다.' },
      { role: 'user', content: `원문 제목: ${row.title}\n언론사: ${row.source}\n원문 게시: ${row.published_at}\n확인된 원문 텍스트:\n${content}` }
    ], max_tokens: 700, temperature: 0.2
  });
  const raw = String(result.response || '');
  let article;
  try { article = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || ''); }
  catch { throw new Error('AI 초안 작성에 실패했습니다. 다시 시도해 주세요.'); }
  const title = String(article.title || '').trim().slice(0, 130);
  const summary = String(article.summary || '').trim().slice(0, 300);
  const body = String(article.body || '').trim().slice(0, 3000);
  if (title.length < 8 || summary.length < 20 || body.length < 80) throw new Error('AI 초안의 내용이 부족합니다. 다른 기사를 선택해 주세요.');
  return { title, summary, body };
}

function decodeXml(value) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(x[\da-f]+|\d+);/gi, (entity, n) => {
      const codepoint = parseInt(n[0]?.toLowerCase() === 'x' ? n.slice(1) : n, n[0]?.toLowerCase() === 'x' ? 16 : 10);
      return codepoint > 0 && codepoint <= 0x10ffff && !(codepoint >= 0xd800 && codepoint <= 0xdfff)
        ? String.fromCodePoint(codepoint) : entity;
    })
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function tag(xml, name) {
  return decodeXml(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || '').trim();
}

async function refresh(db, ai) {
  const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent('정읍 when:2d') + '&hl=ko&gl=KR&ceid=KR:ko';
  const response = await fetch(url, { headers: { 'User-Agent': 'JeongeupCultureNews/1.0' }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('기사 검색에 실패했습니다.');
  const xml = await response.text();
  const candidates = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 30).map(m => {
    const body = m[1];
    const fullTitle = tag(body, 'title');
    const source = tag(body, 'source') || fullTitle.split(' - ').pop() || '언론사';
    const title = fullTitle.endsWith(' - ' + source) ? fullTitle.slice(0, -source.length - 3) : fullTitle;
    const published = new Date(tag(body, 'pubDate'));
    return { title, source, url: tag(body, 'link'), published_at: Number.isNaN(published.valueOf()) ? '' : published.toISOString() };
  }).filter(x => x.title.includes('정읍') && x.published_at && /^https:\/\//.test(x.url));
  let ranked = candidates;
  let usedAi = false;
  if (ai && candidates.length) {
    try {
      const result = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
        messages: [
          { role: 'system', content: '정읍 지역 뉴스 편집자입니다. 제공된 제목만 보고 지역 주민의 관심도가 높고 서로 다른 이슈의 기사 3개를 고르세요. 사실을 만들지 말고 번호 3개만 쉼표로 출력하세요.' },
          { role: 'user', content: candidates.map((x, i) => `${i + 1}. ${x.title} (${x.source})`).join('\n') }
        ], max_tokens: 50
      });
      const numbers = (String(result.response || '').match(/\d+/g) || []).map(Number).filter(n => n >= 1 && n <= candidates.length);
      if (new Set(numbers).size >= 3) {
        ranked = [...new Set(numbers)].map(n => candidates[n - 1]).concat(candidates.filter((_, i) => !numbers.includes(i + 1)));
        usedAi = true;
      }
    } catch (error) { console.error('AI 추천 실패', error); }
  }
  for (const item of ranked) {
    await db.prepare('INSERT OR IGNORE INTO news_items (title, source, url, published_at) VALUES (?, ?, ?, ?)')
      .bind(item.title, item.source, item.url, item.published_at).run();
  }
  return { count: ranked.length, usedAi };
}

export async function onRequest({ request, env }) {
  if (!env.ds || !env.NEWS_ADMIN_PASSWORD || env.NEWS_ADMIN_PASSWORD.length < 16) return json({ error: '서버 설정이 필요합니다.' }, 503);
  await init(env.ds);
  const currentDay = day();
  if (request.method === 'GET') {
    if (!await authorized(request, env)) return json({ authenticated: false }, 401);
    const { results = [] } = await env.ds.prepare('SELECT id, title, source, url, published_at, approved_day, featured_order, article_title, article_summary, article_body, article_reviewed FROM news_items WHERE published_at >= ? ORDER BY CASE WHEN approved_day = ? THEN 0 ELSE 1 END, featured_order, published_at DESC LIMIT 60')
      .bind(new Date(Date.now() - 3 * 86400000).toISOString(), currentDay).all();
    return json({ authenticated: true, day: currentDay, news: results });
  }
  if (request.method !== 'POST') return json({ error: '허용되지 않은 요청' }, 405);
  const origin = request.headers.get('Origin');
  if (!origin || origin !== new URL(request.url).origin) return json({ error: '요청 출처가 올바르지 않습니다.' }, 403);
  let data;
  try { data = await request.json(); } catch { return json({ error: '요청 형식 오류' }, 400); }
  if (data.action === 'login') {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const previous = await env.ds.prepare('SELECT attempts, first_attempt FROM news_login_attempts WHERE ip = ?').bind(ip).first();
    if (previous?.attempts >= 5 && Date.now() - previous.first_attempt < 900000) return json({ error: '15분 후 다시 시도해 주세요.' }, 429);
    const password = String(data.password || '');
    if (!equal(password, env.NEWS_ADMIN_PASSWORD)) {
      const attempts = previous && Date.now() - previous.first_attempt < 900000 ? previous.attempts + 1 : 1;
      const first = attempts === 1 ? Date.now() : previous.first_attempt;
      await env.ds.prepare('INSERT INTO news_login_attempts (ip, attempts, first_attempt) VALUES (?, ?, ?) ON CONFLICT(ip) DO UPDATE SET attempts = excluded.attempts, first_attempt = excluded.first_attempt').bind(ip, attempts, first).run();
      return json({ error: '비밀번호가 올바르지 않습니다.' }, 401);
    }
    await env.ds.prepare('DELETE FROM news_login_attempts WHERE ip = ?').bind(ip).run();
    const expiry = String(Date.now() + 8 * 3600000);
    return json({ ok: true }, 200, { 'Set-Cookie': `${cookieName}=${expiry}.${await sign(expiry, password)}; Path=/api/news-admin; HttpOnly; Secure; SameSite=Strict; Max-Age=28800` });
  }
  if (!await authorized(request, env)) return json({ error: '관리자 로그인이 필요합니다.' }, 401);
  if (data.action === 'logout') return json({ ok: true }, 200, { 'Set-Cookie': `${cookieName}=; Path=/api/news-admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  if (data.action === 'refresh') {
    try { return json({ ok: true, ...await refresh(env.ds, env.AI) }); }
    catch (error) { return json({ error: String(error.message || error) }, 502); }
  }
  if (data.action === 'draft') {
    const id = Number(data.id);
    if (!Number.isSafeInteger(id) || id < 1) return json({ error: '기사를 선택해 주세요.' }, 400);
    const row = await env.ds.prepare('SELECT id, title, source, url, published_at FROM news_items WHERE id = ? AND published_at >= ?')
      .bind(id, new Date(Date.now() - 3 * 86400000).toISOString()).first();
    if (!row) return json({ error: '기사 후보를 다시 선택해 주세요.' }, 404);
    try {
      const article = await draft(row, env.AI);
      await env.ds.prepare('UPDATE news_items SET article_title = ?, article_summary = ?, article_body = ?, article_reviewed = 0 WHERE id = ?')
        .bind(article.title, article.summary, article.body, id).run();
      return json({ ok: true, article });
    } catch (error) { return json({ error: String(error.message || error) }, 422); }
  }
  if (data.action === 'save') {
    const id = Number(data.id);
    const title = String(data.title || '').trim().slice(0, 130);
    const summary = String(data.summary || '').trim().slice(0, 300);
    const body = String(data.body || '').trim().slice(0, 3000);
    if (!Number.isSafeInteger(id) || title.length < 8 || summary.length < 20 || body.length < 80) return json({ error: '제목·요약·본문 내용을 확인해 주세요.' }, 400);
    const existing = await env.ds.prepare('SELECT id, article_body FROM news_items WHERE id = ?').bind(id).first();
    if (!existing?.article_body) return json({ error: 'AI 초안을 먼저 작성해 주세요.' }, 400);
    await env.ds.prepare('UPDATE news_items SET article_title = ?, article_summary = ?, article_body = ?, article_reviewed = 1 WHERE id = ?')
      .bind(title, summary, body, id).run();
    return json({ ok: true });
  }
  if (data.action === 'publish') {
    const ids = data.ids;
    if (!Array.isArray(ids) || ids.length !== 3 || new Set(ids).size !== 3 || ids.some(id => !Number.isSafeInteger(id) || id < 1)) return json({ error: '서로 다른 기사 3개를 선택하세요.' }, 400);
    const rows = await env.ds.prepare('SELECT id, article_title, article_summary, article_body, article_reviewed FROM news_items WHERE id IN (?, ?, ?) AND published_at >= ?').bind(...ids, new Date(Date.now() - 3 * 86400000).toISOString()).all();
    if (rows.results?.length !== 3 || rows.results.some(row => !row.article_title || !row.article_summary || !row.article_body || !row.article_reviewed)) return json({ error: '선택한 글 3개를 검토하고 각각 수정한 글 저장을 눌러주세요.' }, 400);
    await env.ds.batch([
      env.ds.prepare('UPDATE news_items SET approved_day = NULL, featured_order = 99 WHERE approved_day = ?').bind(currentDay),
      ...ids.map((id, index) => env.ds.prepare('UPDATE news_items SET approved_day = ?, featured_order = ? WHERE id = ?').bind(currentDay, index + 1, id))
    ]);
    return json({ ok: true, day: currentDay });
  }
  return json({ error: '알 수 없는 작업' }, 400);
}
