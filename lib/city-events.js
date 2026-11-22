// Deterministic collector: no AI service or model dependency.
export const ORIGIN = 'https://www.jeongeup.go.kr';
export const POLICY = ORIGIN + '/index.jeongeup?menuCd=DOM_000000106007000000';
export const SOURCES = [
  { id: 'arts', name: '정읍사예술회관', board: 'BBS_0000089', menu: 'DOM_000000608003002001', category: 'AA02', schedule: true },
  { id: 'yeonji', name: '연지아트홀', board: 'BBS_0000089', menu: 'DOM_000000608004002001', category: 'AA04', schedule: true },
  { id: 'notice', name: '정읍시청 새소식·공지사항', board: 'BBS_0000012', menu: 'DOM_000000101001001000', pages: 3 },
  { id: 'tourism', name: '문화관광 기타 축제/행사', board: 'BBS_0000293', menu: 'DOM_000000602017000000', pages: 2, culture: true }
];
export function seoulDay(now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year:'numeric', month:'2-digit', day:'2-digit' }).format(now); }
export function text(html = '') {
  return html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(?:p|div|li|tr|h\d)>|<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, ' ')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n) => { const c = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1),16) : +n; return c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : ''; })
    .replace(/&nbsp;/gi,' ').replace(/&middot;/gi,'·').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&apos;|&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
    .split('\n').map(x=>x.replace(/[\t \r]+/g,' ').trim()).filter(Boolean).join('\n').trim();
}
export function canonical(href) {
  const u = new URL(href.replace(/&amp;/g,'&'), ORIGIN);
  if (u.origin !== ORIGIN || !/^\/(?:culture\/)?(?:board|schedule)\/view\.jeongeup$/.test(u.pathname)) throw new Error('허용되지 않은 원문 주소');
  const board = u.searchParams.get('boardId'), sid = u.searchParams.get('dataSid');
  if (!/^BBS_\d+$/.test(board || '') || !/^\d+$/.test(sid || '')) throw new Error('게시물 번호 누락');
  const v = new URL(u.pathname, ORIGIN);
  for (const k of ['boardId','dataSid','menuCd','categoryCode1']) if(u.searchParams.has(k)) v.searchParams.set(k,u.searchParams.get(k));
  return { key: board + ':' + sid, url: v.href, board };
}
export function links(html, source) {
  const out = new Map();
  html = html.replace(/<!--[\s\S]*?-->/g,'');
  for(const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try { const c = canonical(m[1]); if(c.board !== source.board) continue;
      const title = text(m[0].match(/\btitle=["']([^"']+)["']/i)?.[1] || m[2]).split('작성자 :')[0].trim();
      if(source.id === 'notice' && !/공연|축제|행사|전시|음악|문화|예술|페스타|체험|취소|연기/.test(title)) continue;
      out.set(c.key,{...c,title,source:source.id});
    } catch { /* navigation and attachments are not events */ }
  } return [...out.values()];
}
function date(y,m,d) { y=+y; if(y<100)y+=2000; const v=`${y}-${String(+m).padStart(2,'0')}-${String(+d).padStart(2,'0')}`; return new Date(v+'T00:00:00Z').toISOString().slice(0,10) === v ? v : ''; }
export function dates(value, year) {
  const result=[]; let lastYear=year,lastMonth='';
  for(const m of value.matchAll(/(?:(\d{4}|\d{2})\s*[.년/-]\s*)?(\d{1,2})\s*[.월/-]\s*(\d{1,2})\s*(?:일|\.)?/g)) {
    // Do not interpret a time or a notice's unrelated date: caller scopes to event labels.
    try { const d=date(m[1]||lastYear,m[2],m[3]);if(d){result.push(d);lastYear=+d.slice(0,4);lastMonth=m[2];} } catch {}
  }
  if(result.length===1 && lastMonth) { const m=value.match(/[~∼～–]\s*(\d{1,2})\s*일/);if(m)try{result.push(date(lastYear,lastMonth,m[1]));}catch{} }
  return result.filter(Boolean);
}
export function parseEvent(html, entry, source, today=seoulDay(), permissions={}) {
  html=html.replace(/<!--[\s\S]*?-->/g,'');
  const fields={};
  for(const m of html.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>\s*<td\b[^>]*>([\s\S]*?)<\/td>/gi)) fields[text(m[1]).replace(/\s/g,'')]=text(m[2]);
  const bodyHtml=html.match(/<(?:td|div)\b[^>]*class=["'][^"']*\bbbs_content\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:td|div)>/i)?.[1] || '';
  const body=text(bodyHtml);
  const line=(pattern)=>body.split('\n').find(x=>pattern.test(x))?.replace(/^[^:：]*[:：]\s*/,'') || '';
  const title=fields['제목'] || entry.title;
  if(!title || !body && !fields['기간']) throw new Error('게시물 형식을 확인할 수 없습니다');
  const eventDate=fields['기간'] || line(/^(?:[○□■ㅇ\-·]\s*)?(?:행\s*사\s*)?(?:일\s*시|일\s*정|기\s*간|행사일|공연일|전시기간)\s*[:：]/);
  const year=(fields['작성일']||today).slice(0,4);
  const ds=dates(eventDate,year);
  const startDate=ds[0]||'',endDate=ds.at(-1)||'';
  const koreanTime=eventDate.match(/(오전|오후)\s*(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?(?:\s*[~∼～-]\s*(?:(오전|오후)\s*)?(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?)?/);
  const clock=(period,h,m)=>String((+h%12)+(period==='오후'?12:0)).padStart(2,'0')+':'+String(m||0).padStart(2,'0');
  const time=fields['시간'] || (eventDate.match(/\d{1,2}:\d{2}(?:\s*[~∼～-]\s*\d{1,2}:\d{2})?/)||[])[0] || (koreanTime?clock(koreanTime[1],koreanTime[2],koreanTime[3])+(koreanTime[5]?' ~ '+clock(koreanTime[4]||koreanTime[1],koreanTime[5],koreanTime[6]):''):'');
  const place=fields['장소'] || line(/^(?:[○□■ㅇ\-·]\s*)?(?:행\s*사\s*)?장\s*소\s*[:：]/);
  const details=line(/^(?:[○□■ㅇ\-·]\s*)?내\s*용\s*[:：]/);
  const organizer=line(/^(?:[○□■ㅇ\-·]\s*)?주\s*최(?:\s*[·/ㆍ]\s*주\s*관)?\s*[:：]/);
  const cancelled=/취소|개최\s*취소|공연\s*취소/.test(title) || body.split('\n').some(x=>/^(?:행사|공연|개최|본\s*행사).{0,30}(?:취소되었습니다|취소합니다|취소됨)/.test(x));
  // A site's footer KOGL logo does not license an individual poster.
  // Only explicit, asset-specific reviewed permissions can enable image reuse.
  let poster='',posterEvidence='';
  for(const m of bodyHtml.matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi)) {
    let u;try{u=new URL(m[1].replace(/&amp;/g,'&'),ORIGIN);}catch{continue;}
    const p=permissions[u.href];
    if(u.origin===ORIGIN && p?.commercial===true && p?.derivatives===true && p?.evidenceUrl?.startsWith('https://') && p?.attribution) {poster=u.href;posterEvidence=JSON.stringify(p);break;}
  }
  // Reproduce factual fields only; do not copy an unlicensed notice's prose.
  const content=[title,details&&details!==title?'행사 내용: '+details:'',`행사일: ${startDate||'원문 확인 필요'}${endDate&&endDate!==startDate?' ~ '+endDate:''}`,`시간: ${time||'원문 확인 필요'}`,`장소: ${place||'원문 확인 필요'}`,`주최기관: ${organizer||'원문 확인 필요'}`,cancelled?'행사 취소 안내':'',`출처: 정읍시청 (${entry.url})`,posterEvidence?'포스터 출처·이용허가: '+posterEvidence:'포스터는 이용허가 미확인으로 수집하지 않았습니다.'].filter(Boolean).join('\n');
  return {...entry,title,startDate,endDate,time,place,organizer,content,poster,posterEvidence,cancelled,needsReview:!startDate||!place,policyUrl:POLICY};
}
export function comparable(v='') {return v.toLowerCase().replace(/\[(?:변경|취소|연기|안내)\]|\((?:변경|취소|연기|안내)\)/g,'').replace(/[^\p{L}\p{N}]/gu,'');}
export function sameEvent(a,b) { return comparable(a.title)===comparable(b.title) && a.startDate===b.startDate && (!a.place||!b.place||comparable(a.place)===comparable(b.place)); }
export async function initEvents(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS city_events (source_key TEXT PRIMARY KEY, source TEXT NOT NULL, url TEXT NOT NULL, title TEXT NOT NULL, start_date TEXT NOT NULL DEFAULT '', end_date TEXT NOT NULL DEFAULT '', payload TEXT NOT NULL, fingerprint TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', post_id TEXT, checked_at TEXT NOT NULL, approved_at TEXT, error TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS city_collection_runs (id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT, report TEXT)`).run();
  await db.prepare(`CREATE TABLE IF NOT EXISTS city_collection_lock (id INTEGER PRIMARY KEY CHECK(id=1), expires_at INTEGER NOT NULL)`).run();
}
async function getHtml(url) {
  const u=new URL(url);if(u.origin!==ORIGIN)throw new Error('수집 대상 외 주소');
  const r=await fetch(u.href,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'User-Agent':'JeongeupCultureEvents/1.0 (+https://www.jeongeup-art.com)','Accept':'text/html'}});
  if(!r.ok || !(r.headers.get('content-type')||'').includes('text/html'))throw new Error(`원문 응답 ${r.status}`);
  const s=await r.text();if(s.length>1500000)throw new Error('응답 크기 초과');return s;
}
export async function collect(env) {
  const db=env.ds;await initEvents(db);
  const locked=await db.prepare('INSERT INTO city_collection_lock(id,expires_at) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET expires_at=excluded.expires_at WHERE expires_at < ?').bind(Date.now()+10*60000,Date.now()).run();
  if(!locked.meta?.changes)return {busy:true,message:'이미 수집 중입니다.'};
  const now=new Date().toISOString(),today=seoulDay(),id=crypto.randomUUID();
  const report={checked:0,added:0,changed:0,duplicates:0,past:0,errors:[],sources:[],deferred:0};
  try {
    await db.prepare('INSERT INTO city_collection_runs(id,started_at) VALUES(?,?)').bind(id,now).run();
    const robots=await getHtmlRobots();
    if(!robots)throw new Error('robots.txt 수집 허용을 확인하지 못했습니다.');
    let permissions={};try {permissions=JSON.parse(env.CITY_POSTER_PERMISSIONS||'{}');}catch{throw new Error('포스터 허가 설정 형식 오류');}
    const entries=new Map();
    // Check previously tracked upcoming records even if removed from a listing.
    const tracked=await db.prepare("SELECT source_key,url,source,title FROM city_events WHERE end_date >= ? OR end_date = '' ORDER BY checked_at ASC LIMIT 20").bind(today).all();
    for(const row of tracked.results||[])entries.set(row.source_key,{key:row.source_key,url:row.url,source:row.source,title:row.title});
    for(const source of SOURCES) {
      let found=0;
      try {
        const lists=[];
        if(source.schedule)for(let offset=0;offset<2;offset++) {
          const d=new Date(today+'T00:00:00Z');d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+offset);
          const start=d.toISOString().slice(0,10);d.setUTCMonth(d.getUTCMonth()+1);d.setUTCDate(0);
          for(let page=1;page<=2;page++) lists.push(`${ORIGIN}/culture/schedule/list.jeongeup?boardId=${source.board}&menuCd=${source.menu}&categoryCode1=${source.category}&paging=ok&startPage=${page}&searchStartDt=${start}&searchEndDt=${d.toISOString().slice(0,10)}`);
        }else for(let page=1;page<=source.pages;page++)lists.push(`${ORIGIN}/${source.culture?'culture/':''}board/list.jeongeup?boardId=${source.board}&menuCd=${source.menu}&paging=ok&startPage=${page}`);
        for(const url of lists){ const html=await getHtml(url);if(/게시물 에러 페이지/.test(html))throw new Error('게시판 주소 또는 형식 변경');for(const entry of links(html,source)){found++;entries.set(entry.key,entry);} }
        report.sources.push({source:source.name,found});
      }catch(e){report.errors.push(source.name+': '+e.message);}
    }
    const posts=(await db.prepare('SELECT id,title,startDate,endDate,place FROM posts').all()).results||[];
    const records=(await db.prepare('SELECT source_key,payload,post_id,status,checked_at,fingerprint FROM city_events').all()).results||[];
    const all=[...entries.values()].filter(e=>{
      const r=records.find(x=>x.source_key===e.key);return !r || r.status!=='expired';
    }).sort((a,b)=>{
      const checked=e=>records.find(x=>x.source_key===e.key)?.checked_at || '';
      return checked(a).localeCompare(checked(b));
    });report.deferred=Math.max(0,all.length-30);
    for(const entry of all.slice(0,30)) {
      try {
        const source=SOURCES.find(x=>x.id===entry.source);if(!source)continue;
        const event=parseEvent(await getHtml(entry.url),entry,source,today,permissions);
        const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(event)))),b=>b.toString(16).padStart(2,'0')).join('');
        const previous=records.find(x=>x.source_key===entry.key);
        const same=records.find(x=>x.source_key!==entry.key&&sameEvent(event,JSON.parse(x.payload)));
        const post=posts.find(x=>sameEvent(event,x));
        let status=previous?.status||'pending',postId=previous?.post_id||same?.post_id||post?.id||null;
        const changed=previous&&fingerprint!==previous.fingerprint;
        if(previous && changed)status='pending';
        if(!previous && (same||post)){status='duplicate';report.duplicates++;}
        if(event.endDate && event.endDate<today){status='expired';report.past++;}
        // Cancellation of a tracked published event must remain reviewable.
        if(changed&&previous.post_id&&event.cancelled)status='pending';
        await db.prepare(`INSERT INTO city_events(source_key,source,url,title,start_date,end_date,payload,fingerprint,status,post_id,checked_at,error) VALUES(?,?,?,?,?,?,?,?,?,?,?,NULL) ON CONFLICT(source_key) DO UPDATE SET url=excluded.url,title=excluded.title,start_date=excluded.start_date,end_date=excluded.end_date,payload=excluded.payload,fingerprint=excluded.fingerprint,status=excluded.status,post_id=excluded.post_id,checked_at=excluded.checked_at,error=NULL`).bind(entry.key,entry.source,entry.url,event.title,event.startDate,event.endDate,JSON.stringify(event),fingerprint,status,postId,now).run();
        if(!previous){records.push({source_key:entry.key,payload:JSON.stringify(event),post_id:postId,status});if(status==='pending')report.added++;}
        else if(changed)report.changed++;
        report.checked++;
      }catch(e){report.errors.push(entry.key+': '+e.message);await db.prepare('UPDATE city_events SET error=?,checked_at=? WHERE source_key=?').bind('원문 확인 실패: '+e.message,now,entry.key).run();}
    }
    // A failed/removed page is never interpreted as cancellation.
    await db.prepare("UPDATE city_events SET status='expired' WHERE end_date <> '' AND end_date < ? AND status='pending' AND post_id IS NULL").bind(today).run();
    await db.prepare('UPDATE city_collection_runs SET finished_at=?,report=? WHERE id=?').bind(new Date().toISOString(),JSON.stringify(report),id).run();
    return report;
  } catch(e) {report.errors.push(e.message);await db.prepare('UPDATE city_collection_runs SET finished_at=?,report=? WHERE id=?').bind(new Date().toISOString(),JSON.stringify(report),id).run();throw e;}
  finally {await db.prepare('DELETE FROM city_collection_lock WHERE id=1').run();}
}
async function getHtmlRobots(){
  const r=await fetch(ORIGIN+'/robots.txt',{redirect:'manual',signal:AbortSignal.timeout(10000)});if(!r.ok)return false;
  const s=await r.text();let active=false;for(const line of s.split('\n')) {const m=line.match(/^\s*(User-agent|Disallow|Allow)\s*:\s*(.*?)\s*$/i);if(!m)continue;if(m[1].toLowerCase()==='user-agent')active=m[2]==='*';else if(active&&m[1].toLowerCase()==='disallow'&&m[2])return false;}return true;
}
export async function eventList(db) {
  await initEvents(db);const today=seoulDay();
  const rows=await db.prepare("SELECT * FROM city_events WHERE (status='pending' AND (end_date='' OR end_date>=? OR post_id IS NOT NULL)) OR error IS NOT NULL ORDER BY checked_at DESC LIMIT 200").bind(today).all();
  const run=await db.prepare('SELECT * FROM city_collection_runs ORDER BY started_at DESC LIMIT 1').first();
  return {events:(rows.results||[]).map(row=>({...JSON.parse(row.payload),status:row.status,postId:row.post_id,checkedAt:row.checked_at,revision:row.fingerprint,error:row.error})),run:run?{...run,report:run.report?JSON.parse(run.report):null}:null,sources:SOURCES};
}
export async function reviewEvent(db,key,action,revision) {
  await initEvents(db);const row=await db.prepare('SELECT * FROM city_events WHERE source_key=?').bind(key).first();
  if(!row || row.status!=='pending')throw new Error('승인 대기 행사를 다시 선택해 주세요.');
  if(!revision || revision!==row.fingerprint)throw new Error('수집 내용이 변경되었습니다. 목록을 새로고침해 다시 검토해 주세요.');
  if(action==='reject'){await db.prepare("UPDATE city_events SET status='rejected' WHERE source_key=? AND fingerprint=?").bind(key,revision).run();return {ok:true};}
  const e=JSON.parse(row.payload);
  if(row.error)throw new Error('원문 확인에 실패한 행사입니다. 다시 수집한 후 승인해 주세요.');
  if(!e.startDate||!e.place)throw new Error('날짜 또는 장소가 불확실합니다. 원문을 확인해 직접 등록해 주세요.');
  if(e.endDate<seoulDay()&&!row.post_id)throw new Error('지난 행사는 새로 게시할 수 없습니다.');
  const postId=row.post_id||'city-'+key.replace(/[^a-zA-Z0-9]/g,'-');
  if(!row.post_id){const posts=(await db.prepare('SELECT id,title,startDate,place FROM posts').all()).results||[];if(posts.some(p=>sameEvent(e,p)))throw new Error('이미 등록된 행사입니다. 다시 수집하면 중복으로 제외됩니다.');}
  if(e.cancelled&&!row.post_id)throw new Error('취소된 행사는 신규 게시하지 않습니다. 제외를 눌러 주세요.');
  const title=e.cancelled?'[취소] '+e.title.replace(/^\[취소\]\s*/,''):e.title;
  const content=e.content;
  const now=new Date().toISOString();
  const mutation=row.post_id?db.prepare(`UPDATE posts SET title=?,content=?,startDate=?,endDate=?,place=?,author=?,mediaUrl=?,imageUrl=? WHERE id=? AND EXISTS(SELECT 1 FROM city_events WHERE source_key=? AND fingerprint=? AND status='pending')`).bind(title,content,e.startDate,e.endDate,e.place,e.organizer||'정읍시청',e.poster||'/event-placeholder.svg',e.poster||'/event-placeholder.svg',postId,key,revision):db.prepare(`INSERT INTO posts(id,title,content,mediaType,mediaUrl,imageUrl,startDate,endDate,place,author,created_at,createdAt,views,likes) SELECT ?,?,?,'image',?,?,?,?,?,?,?,?,0,0 WHERE EXISTS(SELECT 1 FROM city_events WHERE source_key=? AND fingerprint=? AND status='pending')`).bind(postId,title,content,e.poster||'/event-placeholder.svg',e.poster||'/event-placeholder.svg',e.startDate,e.endDate,e.place,e.organizer||'정읍시청',now,now,key,revision);
  // Updates deliberately omit views, likes, comments and existing timestamps.
  const result=await db.batch([mutation,db.prepare("UPDATE city_events SET status='approved',post_id=?,approved_at=? WHERE source_key=? AND status='pending' AND fingerprint=? AND EXISTS(SELECT 1 FROM posts WHERE id=?)").bind(postId,now,key,revision,postId)]);
  if(!result[0]?.meta?.changes)throw new Error('행사 내용이 변경되었거나 원 게시물이 삭제되었습니다. 새로고침 후 확인해 주세요.');
  return {ok:true,postId};
}
