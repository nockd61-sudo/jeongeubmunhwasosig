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
    const { results = [] } = await env.ds.prepare('SELECT id, title, source, url, published_at, approved_day, featured_order FROM news_items WHERE published_at >= ? ORDER BY CASE WHEN approved_day = ? THEN 0 ELSE 1 END, featured_order, published_at DESC LIMIT 60')
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
  if (data.action === 'publish') {
    const ids = data.ids;
    if (!Array.isArray(ids) || ids.length !== 3 || new Set(ids).size !== 3 || ids.some(id => !Number.isSafeInteger(id) || id < 1)) return json({ error: '서로 다른 기사 3개를 선택하세요.' }, 400);
    const rows = await env.ds.prepare('SELECT id FROM news_items WHERE id IN (?, ?, ?) AND published_at >= ?').bind(...ids, new Date(Date.now() - 3 * 86400000).toISOString()).all();
    if (rows.results?.length !== 3) return json({ error: '기사 선택을 다시 확인하세요.' }, 400);
    await env.ds.batch([
      env.ds.prepare('UPDATE news_items SET approved_day = NULL, featured_order = 99 WHERE approved_day = ?').bind(currentDay),
      ...ids.map((id, index) => env.ds.prepare('UPDATE news_items SET approved_day = ?, featured_order = ? WHERE id = ?').bind(currentDay, index + 1, id))
    ]);
    return json({ ok: true, day: currentDay });
  }
  return json({ error: '알 수 없는 작업' }, 400);
}
