import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { collect, parseEvent, canonical, dates, links, SOURCES, ORIGIN, initEvents, eventList, reviewEvent, sameEvent, seoulDay } from '../lib/city-events.js';
import { onRequest as cronEndpoint } from '../functions/api/city-collect.js';
function d1() {
  const sql=new DatabaseSync(':memory:');
  const db={sql,prepare(q){return {args:[],bind(...args){this.args=args;return this;},async run(){const r=sql.prepare(q).run(...this.args);return {meta:{changes:Number(r.changes)}};},async first(){return sql.prepare(q).get(...this.args)||null;},async all(){return {results:sql.prepare(q).all(...this.args)};}};},async batch(statements){sql.exec('BEGIN');try{const result=[];for(const s of statements)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  sql.exec(`CREATE TABLE posts(id TEXT PRIMARY KEY,title TEXT,content TEXT,mediaType TEXT,mediaUrl TEXT,imageUrl TEXT,startDate TEXT,endDate TEXT,place TEXT,author TEXT,created_at TEXT,createdAt TEXT,views INTEGER,likes INTEGER);CREATE TABLE comments(post_id TEXT,content TEXT);`);return db;
}
const today=seoulDay(),tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10),later=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
function page({title='정읍 테스트 공연',start=tomorrow,end=start,place='연지아트홀',extra=''}={}) {return `<table><tr><th>제목</th><td>${title}</td></tr><tr><th>기간</th><td>${start} ~ ${end}</td></tr><tr><th>시간</th><td>19:00</td></tr><tr><th>장소</th><td>${place}</td></tr><tr><td class="bbs_content"><p>주최·주관 : 정읍시 문화예술과</p>${extra}</td></tr></table>`;}
const entry={...canonical(ORIGIN+'/culture/schedule/view.jeongeup?boardId=BBS_0000089&dataSid=123&menuCd='+SOURCES[1].menu),source:'yeonji',title:'정읍 테스트 공연'};
function fakeFetch(detail,options={}) {
 return async url=>{
  url=String(url);
  if(url.endsWith('robots.txt'))return new Response(options.blocked?'User-agent: *\nDisallow: /':'User-agent: Googlebot\nDisallow: /\nUser-agent: *\nAllow: /');
  if(url.includes('/view.')){if(options.missing)return new Response('gone',{status:404});return new Response(detail(),{headers:{'content-type':'text/html'}});}
  if(url.includes('categoryCode1=AA04'))return new Response(`<a href="${entry.url}">정읍 테스트 공연</a>`,{headers:{'content-type':'text/html'}});
  return new Response('<table></table>',{headers:{'content-type':'text/html'}});
 };
}
test('real-world schedule fields, Seoul timezone and dates',()=>{
 const e=parseEvent(page(),entry,SOURCES[1]);assert.equal(e.time,'19:00');assert.equal(e.organizer,'정읍시 문화예술과');assert.equal(e.startDate,tomorrow);
 assert.equal(seoulDay(new Date('2026-11-21T15:01:00Z')),'2026-11-22');
 assert.deepEqual(dates('26. 11. 25.(수) 19:00',2026),['2026-11-25']);assert.deepEqual(dates('2026-11-25 ~ 2026-11-27',2026),['2026-11-25','2026-11-27']);assert.deepEqual(dates('2026. 2. 30.',2026),[]);
});
test('URL identity excludes tracking and rejects external sources',()=>{
 assert.equal(canonical(entry.url+'&startPage=2').key,entry.key);assert.throws(()=>canonical('https://evil.example/board/view.jeongeup?boardId=BBS_0000089&dataSid=123'));
 assert.equal(links(`<a href="${entry.url}">공연</a><a href="${entry.url}&startPage=2">공연</a>`,SOURCES[1]).length,1);
});
test('unlicensed poster and generic footer are excluded; reviewed asset permitted',()=>{
 const url=ORIGIN+'/upload/poster.jpg';const html=page({extra:`<img src="${url}">`})+'<footer>공공누리 제1유형</footer>';
 assert.equal(parseEvent(html,entry,SOURCES[1]).poster,'');
 assert.equal(parseEvent(html,entry,SOURCES[1],today,{[url]:{commercial:true,derivatives:true,evidenceUrl:ORIGIN+'/permission',attribution:'정읍시청 허가'}}).poster,url);
});
test('duplicates, approval, schedule change and cancellation preserve engagement',async()=>{
 const db=d1(),env={ds:db};let html=page();const saved=globalThis.fetch;globalThis.fetch=fakeFetch(()=>html);
 try {
  const first=await collect(env);assert.equal(first.added,1);assert.equal((await eventList(db)).events.length,1);
  const duplicate=await collect(env);assert.equal(duplicate.added,0);assert.equal(duplicate.changed,0);
  let e=(await eventList(db)).events[0];await assert.rejects(()=>reviewEvent(db,e.key,'approve','stale'),/변경/);
  const posted=await reviewEvent(db,e.key,'approve',e.revision);db.sql.prepare('UPDATE posts SET views=912,likes=42 WHERE id=?').run(posted.postId);db.sql.prepare('INSERT INTO comments VALUES(?,?)').run(posted.postId,'유지할 댓글');
  html=page({start:later});assert.equal((await collect(env)).changed,1);e=(await eventList(db)).events[0];assert.equal(e.postId,posted.postId);await reviewEvent(db,e.key,'approve',e.revision);
  html=page({start:later,title:'[취소] 정읍 테스트 공연'});await collect(env);e=(await eventList(db)).events[0];assert.equal(e.cancelled,true);await reviewEvent(db,e.key,'approve',e.revision);
  const p=db.sql.prepare('SELECT * FROM posts').get();assert.equal(p.views,912);assert.equal(p.likes,42);assert.equal(p.startDate,later);assert.match(p.title,/취소/);assert.equal(db.sql.prepare('SELECT * FROM comments').all().length,1);
 } finally {globalThis.fetch=saved;}
});
test('existing manual post is deduplicated; past candidates excluded',async()=>{
 const db=d1();db.sql.prepare('INSERT INTO posts(id,title,startDate,place) VALUES(?,?,?,?)').run('manual','정읍 테스트 공연',tomorrow,'연지아트홀');const saved=globalThis.fetch;let html=page();globalThis.fetch=fakeFetch(()=>html);
 try {assert.equal((await collect({ds:db})).duplicates,1);assert.equal((await eventList(db)).events.length,0);
 const db2=d1();html=page({start:'2020-01-01'});assert.equal((await collect({ds:db2})).past,1);assert.equal((await eventList(db2)).events.length,0);
 }finally{globalThis.fetch=saved;}
});
test('failed source is flagged, never treated as cancellation',async()=>{
 const db=d1(),saved=globalThis.fetch;globalThis.fetch=fakeFetch(()=>page());
 try{await collect({ds:db});globalThis.fetch=fakeFetch(()=>'',{missing:true});const r=await collect({ds:db});assert.ok(r.errors.length);const e=(await eventList(db)).events[0];assert.equal(e.cancelled,false);assert.ok(e.error);await assert.rejects(()=>reviewEvent(db,e.key,'approve',e.revision),/원문 확인/);}finally{globalThis.fetch=saved;}
});
test('collector lock and robots refusal do not write events',async()=>{
 const db=d1();await initEvents(db);db.sql.prepare('INSERT INTO city_collection_lock VALUES(1,?)').run(Date.now()+60000);assert.equal((await collect({ds:db})).busy,true);db.sql.exec('DELETE FROM city_collection_lock');
 const saved=globalThis.fetch;globalThis.fetch=fakeFetch(()=>page(),{blocked:true});try{await assert.rejects(()=>collect({ds:db}),/robots/);assert.equal((await eventList(db)).events.length,0);}finally{globalThis.fetch=saved;}
});
test('scheduled endpoint requires POST and secret',async()=>{
 assert.equal((await cronEndpoint({request:new Request('https://example.test/api/city-collect'),env:{}})).status,405);
 const env={ds:d1(),CITY_COLLECTOR_SECRET:'a'.repeat(40)};
 assert.equal((await cronEndpoint({request:new Request('https://example.test/api/city-collect',{method:'POST'}),env})).status,401);
});

test('deleted published post does not consume pending change approval',async()=>{
 const db=d1(),saved=globalThis.fetch;let html=page();globalThis.fetch=fakeFetch(()=>html);
 try {await collect({ds:db});let e=(await eventList(db)).events[0];const p=await reviewEvent(db,e.key,'approve',e.revision);
 db.sql.prepare('DELETE FROM posts WHERE id=?').run(p.postId);html=page({start:later});await collect({ds:db});e=(await eventList(db)).events[0];
 await assert.rejects(()=>reviewEvent(db,e.key,'approve',e.revision),/삭제/);assert.equal((await eventList(db)).events[0].status,'pending');
 }finally{globalThis.fetch=saved;}
});
